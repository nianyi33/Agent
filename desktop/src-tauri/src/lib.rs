use std::process::{Command, Child};
use std::sync::Mutex;
use tauri::Manager;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

struct Backend(Mutex<Option<Child>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .setup(|app| {
      // Resolve project root: CARGO_MANIFEST_DIR = desktop/src-tauri/ → parent → parent = project root
      let manifest = std::env::var("CARGO_MANIFEST_DIR").unwrap_or_default();
      let backend_root = std::path::Path::new(&manifest)
        .parent().and_then(|p| p.parent())
        .map(|p| p.to_path_buf())
        .unwrap_or_default();

      // Kill any existing backend process on port 3721 before starting a new one
      #[cfg(target_os = "windows")]
      {
        let _ = Command::new("cmd")
          .args(["/c", "for /f \"tokens=5\" %a in ('netstat -ano ^| findstr :3721 ^| findstr LISTENING') do taskkill /f /pid %a 2>nul"])
          .stdout(std::process::Stdio::null())
          .stderr(std::process::Stdio::null())
          .creation_flags(0x08000000)
          .spawn();
      }
      println!("[VeloraAgent] Backend root: {:?}", backend_root);

      let mut cmd = Command::new("node");
      cmd.args(["--env-file=.env", "src/index.js"])
         .current_dir(&backend_root)
         .env("BAILONGMA_PORT", "3721")
         .stdout(std::process::Stdio::null())
         .stderr(std::process::Stdio::null());
      #[cfg(target_os = "windows")]
      { cmd.creation_flags(0x08000000); }

      match cmd.spawn() {
        Ok(c) => {
          println!("[VeloraAgent] Backend started (PID {}), root: {:?}", c.id(), backend_root);
          app.manage(Backend(Mutex::new(Some(c))));
        }
        Err(e) => {
          eprintln!("[VeloraAgent] Backend launch failed: {}", e);
          eprintln!("[VeloraAgent] Root was: {:?}, .env exists: {}", backend_root, backend_root.join(".env").exists());
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
              println!("[VeloraAgent] Backend stopped");
            }
          }
        }
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
