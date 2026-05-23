"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  }

  interface Window {
    deferredPrompt?: BeforeInstallPromptEvent | null;
  }
}

const DEFAULT_TEMPLATE_URL = "/fixed-invitation-template.png";

const NAME_X_PERCENT = 42.2;
const NAME_Y_PERCENT = 32.5;
const NAME_FONT_SIZE = 60;
const NAME_BOX_WIDTH_PERCENT = 76;
const NAME_COLOR = "#000000";
const NAME_WEIGHT = "700";

const DIWANI_FONT_NAME = "DiwaniCustom";
const FALLBACK_FONT =
  '"DiwaniCustom", "Aref Ruqaa", "Amiri", "Times New Roman", Arial, Tahoma, serif';

function dataUrlToFile(dataUrl: string, filename: string) {
  const arr = dataUrl.split(",");
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
  const binary = atob(arr[1]);

  let length = binary.length;
  const bytes = new Uint8Array(length);

  while (length--) {
    bytes[length] = binary.charCodeAt(length);
  }

  return new File([bytes], filename, { type: mime });
}

function fitSingleLineFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  startSize: number,
  minSize: number
) {
  let size = startSize;

  while (size >= minSize) {
    ctx.font = `${NAME_WEIGHT} ${size}px ${FALLBACK_FONT}`;

    if (ctx.measureText(text).width <= maxWidth) {
      return size;
    }

    size -= 2;
  }

  return minSize;
}
function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 32 32"
      width="22"
      height="22"
      aria-hidden="true"
      className="btn-icon"
    >
      <path
        fill="currentColor"
        d="M19.11 17.39c-.28-.14-1.63-.8-1.89-.89-.25-.09-.43-.14-.62.14-.18.28-.71.89-.87 1.07-.16.18-.32.21-.6.07-.28-.14-1.16-.43-2.21-1.38-.81-.72-1.35-1.6-1.51-1.88-.16-.28-.02-.43.12-.57.12-.12.28-.32.42-.48.14-.16.18-.28.28-.46.09-.18.05-.35-.02-.48-.07-.14-.62-1.48-.85-2.03-.22-.52-.45-.45-.62-.46h-.53c-.18 0-.48.07-.74.35s-.96.94-.96 2.28c0 1.35.98 2.65 1.12 2.83.14.18 1.93 2.95 4.68 4.13.66.28 1.18.45 1.59.58.67.21 1.28.18 1.76.11.54-.08 1.63-.67 1.86-1.31.23-.64.23-1.19.16-1.31-.07-.11-.25-.18-.53-.32Z"
      />
      <path
        fill="currentColor"
        d="M27.27 4.71A15.83 15.83 0 0 0 16.03.06C7.29.06.16 7.19.16 15.94c0 2.79.73 5.52 2.11 7.93L0 31.94l8.28-2.18a15.88 15.88 0 0 0 7.75 1.98h.01c8.74 0 15.87-7.13 15.87-15.87 0-4.24-1.65-8.23-4.64-11.16Zm-11.24 24.3h-.01a13.3 13.3 0 0 1-6.78-1.86l-.49-.29-4.92 1.29 1.31-4.8-.32-.49a13.26 13.26 0 0 1-2.03-7.08c0-7.33 5.96-13.29 13.29-13.29 3.54 0 6.87 1.38 9.37 3.87 2.5 2.5 3.88 5.83 3.88 9.37-.01 7.33-5.97 13.29-13.3 13.29Z"
      />
    </svg>
  );
}
export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [templateUrl, setTemplateUrl] = useState(DEFAULT_TEMPLATE_URL);
  const [guestName, setGuestName] = useState("  ");
  const [message, setMessage] = useState(
    "السلام عليكم ورحمة الله وبركاته\nيشرفنا دعوتكم لحضور حفل الزواج.\n."
  );

  const [imageReady, setImageReady] = useState(false);
  const [status, setStatus] = useState("");
  const [canInstall, setCanInstall] = useState(false);
  const [fontLoaded, setFontLoaded] = useState(false);

  const [shareCount, setShareCount] = useState(0);
  const [downloadCount, setDownloadCount] = useState(0);

  useEffect(() => {
    const savedShareCount = Number(localStorage.getItem("shareCount") || "0");
    const savedDownloadCount = Number(localStorage.getItem("downloadCount") || "0");

    setShareCount(savedShareCount);
    setDownloadCount(savedDownloadCount);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      window.deferredPrompt = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => null);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    async function loadFonts() {
      try {
        await document.fonts.load(`700 48px "Aref Ruqaa"`);
      } catch {
        // تجاهل
      }

      try {
        const font = new FontFace(DIWANI_FONT_NAME, 'url("/fonts/Diwani.ttf")');
        await font.load();
        document.fonts.add(font);
      } catch {
        // إذا لم يوجد Diwani.ttf سيستخدم التطبيق خطًا احتياطيًا
      }

      setFontLoaded(true);
    }

    loadFonts();
  }, []);

  function handleTemplateUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatus("الملف المرفوع ليس صورة صحيحة.");
      return;
    }

    const url = URL.createObjectURL(file);
    setTemplateUrl(url);
    setStatus("تم رفع القالب. اكتب الاسم وسيظهر داخل المستطيل.");
  }

  useEffect(() => {
    if (!templateUrl) {
      setImageReady(false);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new window.Image();

    img.onload = () => {
      const maxCanvasWidth = 1800;
      const scale = img.width > maxCanvasWidth ? maxCanvasWidth / img.width : 1;

      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const text = guestName.trim();

      if (!text) {
        setImageReady(true);
        return;
      }

      const x = width * (NAME_X_PERCENT / 100);
      const y = height * (NAME_Y_PERCENT / 100);
      const maxTextWidth = width * (NAME_BOX_WIDTH_PERCENT / 100);

      const startSize = Math.round(NAME_FONT_SIZE * scale);
      const minSize = Math.round(27 * scale);

      const fittedSize = fitSingleLineFontSize(
        ctx,
        text,
        maxTextWidth,
        startSize,
        minSize
      );

      ctx.save();

      ctx.font = `${NAME_WEIGHT} ${fittedSize}px ${FALLBACK_FONT}`;
      ctx.fillStyle = NAME_COLOR;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.direction = "rtl";

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      ctx.fillText(text, x, y);

      ctx.restore();

      setImageReady(true);
    };

    img.onerror = () => {
      setImageReady(false);
      setStatus("تعذر تحميل صورة القالب. جرّب صورة أخرى.");
    };

    img.src = templateUrl;
  }, [templateUrl, guestName, fontLoaded]);

  async function installApp() {
    if (!window.deferredPrompt) {
      setStatus(
        "إذا لم يظهر زر التثبيت، افتح قائمة المتصفح واختر: إضافة إلى الشاشة الرئيسية."
      );
      return;
    }

    await window.deferredPrompt.prompt();
    await window.deferredPrompt.userChoice;

    window.deferredPrompt = null;
    setCanInstall(false);
  }

  function getPngDataUrl() {
    const canvas = canvasRef.current;

    if (!canvas || !imageReady) return null;

    return canvas.toDataURL("image/png", 1);
  }

  function downloadImage() {
    const dataUrl = getPngDataUrl();

    if (!dataUrl) {
      setStatus("اكتب الاسم أولًا.");
      return;
    }

    const link = document.createElement("a");
    const safeName = guestName.replace(/[\\/:*?"<>|]/g, "").slice(0, 60);

    link.download = `دعوة - ${safeName || "مدعو"}.png`;
    link.href = dataUrl;
    link.click();

    const nextDownloadCount = downloadCount + 1;
    setDownloadCount(nextDownloadCount);
    localStorage.setItem("downloadCount", String(nextDownloadCount));

    setStatus("تم تجهيز تحميل الصورة.");
  }

  async function shareImage() {
    const dataUrl = getPngDataUrl();

    if (!dataUrl) {
      setStatus("اكتب الاسم أولًا.");
      return;
    }

    const file = dataUrlToFile(dataUrl, "wedding-invitation.png");

    const nav = navigator as Navigator & {
      canShare?: (data: ShareData) => boolean;
    };

    if (navigator.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
      try {
        await navigator.share({
          title: "بطاقة دعوة",
          text: message,
          files: [file],
        });

        const nextShareCount = shareCount + 1;
        setShareCount(nextShareCount);
        localStorage.setItem("shareCount", String(nextShareCount));

        setStatus("تم فتح نافذة المشاركة. اختر واتساب ثم أرسل الدعوة.");
      } catch {
        setStatus("تم إلغاء المشاركة أو تعذرت من المتصفح.");
      }
    } else {
      setStatus(
        "المتصفح لا يدعم مشاركة الصور مباشرة. استخدم زر تحميل الصورة ثم أرسلها من واتساب."
      );
    }
  }

  function resetStats() {
    localStorage.setItem("shareCount", "0");
    localStorage.setItem("downloadCount", "0");

    setShareCount(0);
    setDownloadCount(0);

    setStatus("تم تصفير الإحصائية.");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <Image
            src="/logo.png"
            alt="شعار التطبيق"
            width={48}
            height={48}
            className="brand-logo"
          />

          <div className="brand-title">
            <h1>تجهيز دعوات الزواج</h1>
            <p>اكتب الاسم فقط وستظهر الدعوة مباشرة</p>
          </div>
        </div>

        {canInstall ? (
          <button className="install-btn" onClick={installApp}>
            تثبيت
          </button>
        ) : null}
      </header>

      <section className="card stats-card">
        <div className="stats-grid">
          <div>
            <span>تمت المشاركة</span>
            <strong>{shareCount}</strong>
          </div>

          <div>
            <span>تم التحميل</span>
            <strong>{downloadCount}</strong>
          </div>
        </div>

        <button className="reset-stats-btn" onClick={resetStats}>
          تصفير الإحصائية
        </button>
      </section>

      <section className="card input-card compact-top">
        <div className="field">
          <label>اسم المدعو</label>
          <input
            className="input name-input"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="اكتب اسم المدعو هنا"
          />
        </div>

        <details className="compact-message">
          <summary>تعديل رسالة واتساب</summary>

          <textarea
            className="textarea compact-textarea"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </details>

        <details className="optional-template">
          <summary>تغيير قالب الدعوة</summary>

          <div className="field optional-upload">
            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={handleTemplateUpload}
            />
          </div>
        </details>
      </section>

      <section className="card preview-card">
        <div className="preview-stage">
          <canvas ref={canvasRef} />
        </div>
      </section>

      {status ? <div className="status">{status}</div> : null}

      <div className="bottom-actions">
        <button
  className="btn btn-primary send-btn"
  disabled={!imageReady}
  onClick={shareImage}
>
  <WhatsAppIcon />
  <span>إرسال الدعوة</span>
</button>

        <button
          className="btn btn-outline"
          disabled={!imageReady}
          onClick={downloadImage}
        >
          تحميل الصورة
        </button>
      </div>

      <footer className="footer">تصميم وبرمجة أبو يماني</footer>
    </main>
  );
}
