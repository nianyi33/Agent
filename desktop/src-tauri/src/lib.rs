use std::process::{Command, Child};
use std::sync::Mutex;
use std::fs;
use tauri::Manager;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

// ── Windows Job Object: tie child process lifetime to parent ──
// When the parent (app.exe) dies for ANY reason — normal close, crash, Ctrl+C,
// task manager end task — the Windows kernel kills every process in the same
// Job Object. This eliminates zombie node.exe permanently.
#[cfg(target_os = "windows")]
mod job_object {
    use std::ffi::c_void;
    use std::ptr;

    type HANDLE = *mut c_void;
    type BOOL = i32;

    extern "system" {
        fn CreateJobObjectW(
            lpJobAttributes: *const c_void,
            lpName: *const u16,
        ) -> HANDLE;
        fn SetInformationJobObject(
            hJob: HANDLE,
            JobObjectInfoClass: u32,
            lpJobObjectInfo: *const c_void,
            cbJobObjectInfoLength: u32,
        ) -> BOOL;
        fn AssignProcessToJobObject(
            hJob: HANDLE,
            hProcess: HANDLE,
        ) -> BOOL;
        fn GetCurrentProcess() -> HANDLE;
    }

    const JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE: u32 = 0x2000;
    const JOB_OBJECT_EXTENDED_LIMIT_INFORMATION: u32 = 9;

    #[repr(C)]
    struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION {
        basic_limit_information: JOBOBJECT_BASIC_LIMIT_INFORMATION,
        io_info: IO_COUNTERS,
        process_memory_limit: usize,
        job_memory_limit: usize,
        peak_process_memory_used: usize,
        peak_job_memory_used: usize,
    }

    #[repr(C)]
    struct JOBOBJECT_BASIC_LIMIT_INFORMATION {
        per_process_user_time_limit: i64,
        per_job_user_time_limit: i64,
        limit_flags: u32,
        minimum_working_set_size: usize,
        maximum_working_set_size: usize,
        active_process_limit: u32,
        affinity: usize,
        priority_class: u32,
        scheduling_class: u32,
    }

    #[repr(C)]
    #[allow(non_camel_case_types)]
    struct IO_COUNTERS {
        read_operation_count: u64,
        write_operation_count: u64,
        other_operation_count: u64,
        read_transfer_count: u64,
        write_transfer_count: u64,
        other_transfer_count: u64,
    }

    /// Place the current process into a new Job Object with KILL_ON_JOB_CLOSE.
    /// All child processes (node.exe) automatically inherit the Job.
    /// When the parent dies, the OS kernel kills the entire Job tree.
    pub fn attach_current_process() {
        unsafe {
            let job = CreateJobObjectW(ptr::null(), ptr::null());
            if job.is_null() {
                eprintln!("[闪电树懒] CreateJobObjectW failed");
                return;
            }

            let mut info: JOBOBJECT_EXTENDED_LIMIT_INFORMATION = std::mem::zeroed();
            info.basic_limit_information.limit_flags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;

            let ret = SetInformationJobObject(
                job,
                JOB_OBJECT_EXTENDED_LIMIT_INFORMATION,
                &info as *const _ as *const c_void,
                std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
            );
            if ret == 0 {
                eprintln!("[闪电树懒] SetInformationJobObject failed");
                return;
            }

            let cur = GetCurrentProcess();
            let ret = AssignProcessToJobObject(job, cur);
            if ret == 0 {
                eprintln!("[闪电树懒] AssignProcessToJobObject failed (may already be in a job — expected e.g. under debugger)");
            } else {
                println!("[闪电树懒] Job Object attached — child processes will be killed if parent exits");
            }
        }
    }
}

struct Backend(Mutex<Option<Child>>);

/// Find the backend root directory.
/// In dev: CARGO_MANIFEST_DIR → ../../ = project root (e.g. D:/VeloriaAgent/.../VeloriaAgent/)
/// In prod: app resource_dir → backend/ subfolder
fn resolve_backend_root(app: &tauri::AppHandle) -> std::path::PathBuf {
  // Production: resources are extracted to resource_dir/backend/
  if let Ok(res_dir) = app.path().resource_dir() {
    let bundled = res_dir.join("backend");
    if bundled.join("src").join("index.js").exists() {
      return bundled;
    }
  }
  // Fallback: CARGO_MANIFEST_DIR = desktop/src-tauri → ../../ = project root
  let manifest = std::env::var("CARGO_MANIFEST_DIR").unwrap_or_default();
  std::path::Path::new(&manifest)
    .parent().and_then(|p| p.parent())
    .map(|p| p.to_path_buf())
    .unwrap_or_default()
}

/// Find the node binary — bundled copy first (.exe on Windows, bare on macOS), then system PATH
fn resolve_node(app: &tauri::AppHandle) -> String {
  if let Ok(res_dir) = app.path().resource_dir() {
    let backend = res_dir.join("backend");
    let exe = backend.join("node.exe");
    if exe.exists() { return exe.to_string_lossy().to_string(); }
    let bare = backend.join("node");
    if bare.exists() { return bare.to_string_lossy().to_string(); }
  }
  "node".to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .setup(|app| {
      // ── Attach to Windows Job Object BEFORE spawning anything ──
      // Any child process (node.exe) will be killed by the OS kernel when
      // this process exits — no matter how it exits (normal, crash, Ctrl+C,
      // taskkill, task manager). No zombies, ever.
      #[cfg(target_os = "windows")]
      job_object::attach_current_process();

      let backend_root = resolve_backend_root(&app.handle());
      let node_bin = resolve_node(&app.handle());

      // Point the backend's writable user-data dir to %APPDATA%\闪电树懒 (always writable).
      // Without this, paths.js falls back to REPO_ROOT = the read-only resource dir, and
      // SQLite/mkdir/config writes fail → backend crashes → activation fails.
      let data_dir = app.path().app_data_dir().unwrap_or_else(|_| {
        let fallback = std::env::var("APPDATA")
          .or_else(|_| std::env::var("HOME"))
          .unwrap_or_default();
        std::path::PathBuf::from(fallback).join("闪电树懒")
      });

      // ── Cleanup previous backend ──
      // Job Object covers production but is unavailable under `tauri dev`
      // (the CLI already has a Job, and a process can only be in one).
      //
      // Two layers, BOTH run every startup regardless of state:
      //   1. PID file: kill the last process we spawned, tree and all (/t).
      //   2. wmic: kill ALL node.exe whose command line contains "src\index.js".
      //      Catches every zombie we ever spawned; Vite dev server won't match.
      // Both use .wait() — we don't spawn the new backend until cleanup finishes.
      let pid_file = data_dir.join(".backend-pid");
      if pid_file.exists() {
        if let Ok(raw) = fs::read_to_string(&pid_file) {
          let old_pid = raw.trim();
          if !old_pid.is_empty() {
            #[cfg(target_os = "windows")]
            {
              let _ = Command::new("taskkill")
                .args(["/f", "/t", "/pid", old_pid])
                .stdout(std::process::Stdio::null())
                .stderr(std::process::Stdio::null())
                .creation_flags(0x08000000)
                .spawn()
                .and_then(|mut c| c.wait());
            }
            #[cfg(not(target_os = "windows"))]
            {
              let _ = Command::new("kill")
                .args(["-9", old_pid])
                .spawn()
                .and_then(|mut c| c.wait());
            }
          }
        }
        let _ = fs::remove_file(&pid_file);
      }

      // ALWAYS clean zombies: Any node.exe whose command line contains "src\index.js"
      // is ours. The Vite dev server won't match — its command line is different.
      // wmic is the most reliable way to find and kill by command-line pattern on Windows.
      #[cfg(target_os = "windows")]
      {
        let _ = Command::new("wmic")
          .args(["process", "where", "name='node.exe' and commandline like '%src/index.js%'", "delete"])
          .stdout(std::process::Stdio::null())
          .stderr(std::process::Stdio::null())
          .creation_flags(0x08000000)
          .spawn()
          .and_then(|mut c| c.wait());
      }
      #[cfg(not(target_os = "windows"))]
      {
        let _ = Command::new("sh")
          .args(["-c", "lsof -ti:3721 | xargs -r kill -9 2>/dev/null"])
          .stdout(std::process::Stdio::null())
          .stderr(std::process::Stdio::null())
          .spawn()
          .and_then(|mut c| c.wait());
      }

      println!("[闪电树懒] Node binary: {}", node_bin);
      println!("[闪电树懒] Backend root: {:?}", backend_root);
      println!("[闪电树懒] index.js exists: {}", backend_root.join("src").join("index.js").exists());
      println!("[闪电树懒] node_modules exists: {}", backend_root.join("node_modules").exists());

      // Auto-install dependencies on first run (fallback only — normally node_modules is bundled).
      // Silently skip if npm is unavailable; do not block startup.
      if !backend_root.join("node_modules").exists() {
        println!("[闪电树懒] node_modules missing, attempting npm install (best-effort)...");
        #[cfg(target_os = "windows")]
        let npm_candidate = node_bin.replace("node.exe", "npm.cmd");
        #[cfg(not(target_os = "windows"))]
        let npm_candidate = "npm".to_string();
        let install_cmd = if std::path::Path::new(&npm_candidate).exists() { npm_candidate } else { "npm".to_string() };
        let mut npm = Command::new(&install_cmd);
        npm.args(["install", "--production"])
           .current_dir(&backend_root)
           .stdout(std::process::Stdio::null())
           .stderr(std::process::Stdio::null());
        #[cfg(target_os = "windows")]
        { npm.creation_flags(0x08000000); }
        let _ = npm.spawn()
          .and_then(|mut c| c.wait())
          .map(|s| println!("[闪电树懒] npm install exit: {}", s));
      }

      let mut cmd = Command::new(&node_bin);
      // --env-file=.env is optional: Node v24 hard-errors if the file is missing OR empty,
      // so only pass it when .env exists AND has content in the backend root.
      let env_file = backend_root.join(".env");
      let env_ok = env_file.exists()
        && env_file.metadata().map(|m| m.len() > 0).unwrap_or(false);
      if env_ok {
        cmd.arg("--env-file=.env");
      }
      cmd.args(["src/index.js"])
         .current_dir(&backend_root)
         .env("BAILONGMA_PORT", "3721")
         .env("BAILONGMA_RESOURCES_DIR", backend_root.to_string_lossy().to_string());

      cmd.env("BAILONGMA_USER_DIR", data_dir.to_string_lossy().to_string());

      // Redirect backend stderr to a log file under user data so users can
      // send the file to developers when something goes wrong.
      // stdout stays null — only errors and diagnostics go to the log.
      let log_file = data_dir.join("backend.log");
      let log_stderr = fs::File::create(&log_file)
        .map(|f| std::process::Stdio::from(f))
        .unwrap_or_else(|_| std::process::Stdio::null());
      cmd.stdout(std::process::Stdio::null())
         .stderr(log_stderr);
      println!("[闪电树懒] Backend log: {:?}", log_file);
      #[cfg(target_os = "windows")]
      { cmd.creation_flags(0x08000000); }

      match cmd.spawn() {
        Ok(c) => {
          let pid = c.id();
          println!("[闪电树懒] Backend started (PID {})", pid);
          let _ = fs::write(&pid_file, pid.to_string());
          app.manage(Backend(Mutex::new(Some(c))));
        }
        Err(e) => {
          eprintln!("[闪电树懒] Backend launch failed: {}", e);
          eprintln!("[闪电树懒] Is Node.js installed? Run: node --version");
          app.manage(Backend(Mutex::new(None)));
        }
      }

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .on_window_event(|window, event| {
      if let tauri::WindowEvent::Destroyed = event {
        if let Some(backend) = window.try_state::<Backend>() {
          if let Ok(mut guard) = backend.0.lock() {
            if let Some(ref mut child) = *guard {
              let _ = child.kill();
              println!("[闪电树懒] Backend stopped");
            }
          }
        }
        // Clean up PID file so next launch doesn't try to kill a reused PID
        if let Ok(data_dir) = window.app_handle().path().app_data_dir() {
          let pid_file = data_dir.join(".backend-pid");
          let _ = fs::remove_file(&pid_file);
        }
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
