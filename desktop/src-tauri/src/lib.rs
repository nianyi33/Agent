use std::process::{Command, Child};
use std::sync::Mutex;
use tauri::Manager;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

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

/// Find the node binary — bundled copy first, then system PATH
fn resolve_node(app: &tauri::AppHandle) -> String {
  if let Ok(res_dir) = app.path().resource_dir() {
    let bundled_node = res_dir.join("backend").join("node.exe");
    if bundled_node.exists() {
      return bundled_node.to_string_lossy().to_string();
    }
  }
  "node".to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .setup(|app| {
      let backend_root = resolve_backend_root(&app.handle());
      let node_bin = resolve_node(&app.handle());

      // Kill any existing backend process on port 3721
      #[cfg(target_os = "windows")]
      {
        let _ = Command::new("cmd")
          .args(["/c", "for /f \"tokens=5\" %a in ('netstat -ano ^| findstr :3721 ^| findstr LISTENING') do taskkill /f /pid %a 2>nul"])
          .stdout(std::process::Stdio::null())
          .stderr(std::process::Stdio::null())
          .creation_flags(0x08000000)
          .spawn();
      }

      println!("[闪电树懒] Node binary: {}", node_bin);
      println!("[闪电树懒] Backend root: {:?}", backend_root);
      println!("[闪电树懒] index.js exists: {}", backend_root.join("src").join("index.js").exists());
      println!("[闪电树懒] node_modules exists: {}", backend_root.join("node_modules").exists());

      // Auto-install dependencies on first run (fallback only — normally node_modules is bundled).
      // Silently skip if npm is unavailable; do not block startup.
      if !backend_root.join("node_modules").exists() {
        println!("[闪电树懒] node_modules missing, attempting npm install (best-effort)...");
        let npm_bin = node_bin.replace("node.exe", "npm.cmd");
        let install_cmd = if std::path::Path::new(&npm_bin).exists() { npm_bin } else { "npm".to_string() };
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

      // Point the backend's writable user-data dir to %APPDATA%\闪电树懒 (always writable).
      // Without this, paths.js falls back to REPO_ROOT = the read-only resource dir, and
      // SQLite/mkdir/config writes fail → backend crashes → activation fails.
      if let Ok(data_dir) = app.path().app_data_dir() {
        cmd.env("BAILONGMA_USER_DIR", data_dir.to_string_lossy().to_string());
      }

      cmd.stdout(std::process::Stdio::null())
         .stderr(std::process::Stdio::null());
      #[cfg(target_os = "windows")]
      { cmd.creation_flags(0x08000000); }

      match cmd.spawn() {
        Ok(c) => {
          println!("[闪电树懒] Backend started (PID {})", c.id());
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
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
