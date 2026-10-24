"use strict";

const $ = (id) => document.getElementById(id);
let release = null;
let toastTimer;

function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("visible"), 2800);
}

async function copy(text, message) {
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else {
      const buffer = document.createElement("textarea");
      buffer.value = text;
      buffer.className = "clipboard-buffer";
      document.body.append(buffer);
      buffer.select();
      const copied = document.execCommand("copy");
      buffer.remove();
      if (!copied) throw new Error("Clipboard unavailable");
    }
    toast(message);
  } catch {
    toast("Не удалось скопировать. Можно выделить текст и скопировать вручную.");
  }
}

function closeMenu() {
  $("menu-toggle").setAttribute("aria-expanded", "false");
  $("menu-toggle").setAttribute("aria-label", "Открыть меню");
  $("navigation").classList.remove("open");
}

$("menu-toggle").addEventListener("click", () => {
  const open = $("menu-toggle").getAttribute("aria-expanded") !== "true";
  $("menu-toggle").setAttribute("aria-expanded", String(open));
  $("menu-toggle").setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
  $("navigation").classList.toggle("open", open);
});
for (const link of $("navigation").querySelectorAll("a")) link.addEventListener("click", closeMenu);
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeMenu(); });
$("copy-hash").addEventListener("click", () => { if (release) copy(release.sha256, "SHA-256 скопирован"); });
$("copy-command").addEventListener("click", () => copy($("install-command").textContent, "Команды запуска скопированы"));

async function loadRelease() {
  try {
    const response = await fetch("release.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Missing release");
    const value = await response.json();
    if (!/^\d+\.\d+(?:\.\d+)?$/.test(value.version) ||
        !/^[a-f0-9]{64}$/.test(value.sha256) || !Number.isFinite(value.size) || value.size <= 0 ||
        !/^downloads\/You-[\d.]+-linux\.tar\.gz$/.test(value.url) ||
        !/^You-[\d.]+-linux\.tar\.gz$/.test(value.filename)) throw new Error("Invalid release metadata");
    release = value;
    const size = value.size < 1024 * 1024 ? `${(value.size / 1024).toFixed(0)} КБ` : `${(value.size / 1024 / 1024).toFixed(1)} МБ`;
    for (const node of document.querySelectorAll("[data-version]")) node.textContent = value.version;
    for (const node of document.querySelectorAll("[data-size]")) node.textContent = size;
    for (const node of document.querySelectorAll("[data-filename]")) node.textContent = value.filename;
    for (const link of document.querySelectorAll("[data-download]")) {
      link.href = value.url;
      link.setAttribute("download", value.filename);
    }
    $("checksum").textContent = value.sha256;
    $("copy-hash").disabled = false;
    if (value.version !== "0.2") $("install-command").textContent = `# Распакуй в отдельной папке\ntar -xzf ${value.filename}\ncd You-${value.version}\n./run.sh\n\n# По желанию: добавить в меню\npython3 install_launcher.py`;
    document.documentElement.dataset.releaseReady = "true";
  } catch {
    $("release-error").hidden = false;
    $("checksum").textContent = "Смотри release.json";
    document.documentElement.dataset.releaseReady = "false";
  }
}

loadRelease();

async function loadPlatforms() {
  try {
    const response = await fetch("platforms.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Missing platform builds");
    const builds = await response.json();
    for (const key of ["android", "windows"]) {
      const value = builds[key];
      const filename = key === "android" ? "You-0.2-android.apk" : "You-0.2-windows-x64.exe";
      if (!value || value.filename !== filename || value.url !== `downloads/${filename}` ||
          !/^[a-f0-9]{64}$/.test(value.sha256) || !Number.isSafeInteger(value.size) || value.size <= 0)
        throw new Error("Invalid platform build");
    }
    for (const key of ["android", "windows"]) {
      const value = builds[key];
      const card = document.querySelector(`[data-platform="${key}"]`);
      card.querySelector("[data-platform-size]").textContent = value.size < 1024 * 1024
        ? `${(value.size / 1024).toFixed(0)} КБ` : `${(value.size / 1024 / 1024).toFixed(1)} МБ`;
      card.querySelector("[data-platform-hash]").textContent = value.sha256;
    }
    document.documentElement.dataset.platformsReady = "true";
  } catch {
    $("platform-error").hidden = false;
    document.documentElement.dataset.platformsReady = "false";
  }
}

loadPlatforms();
