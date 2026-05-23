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

/*
  إعدادات ثابتة لهذا القالب فقط:
  الاسم يوضع داخل المستطيل أسفل عبارة "بدعوة المكرم".
  إذا احتجت تعديل بسيط جدًا:
  - زِد NAME_Y_PERCENT لإنزال الاسم
  - أنقص NAME_Y_PERCENT لرفع الاسم
*/
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

function normalizePhone(phone: string) {
  let value = String(phone || "").trim().replace(/[^\d]/g, "");
  if (value.startsWith("00")) value = value.slice(2);
  if (value.startsWith("0")) value = value.slice(1);
  if (value.length === 9 && value.startsWith("7")) value = `967${value}`;
  return value;
}

function dataUrlToFile(dataUrl: string, filename: string) {
  const arr = dataUrl.split(",");
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
  const binary = atob(arr[1]);
  let length = binary.length;
  const bytes = new Uint8Array(length);
  while (length--) bytes[length] = binary.charCodeAt(length);
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
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 2;
  }

  return minSize;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [templateUrl, setTemplateUrl] = useState(DEFAULT_TEMPLATE_URL);
  const [guestName, setGuestName] = useState("عمر يماني الجابري");
  const [phone, setPhone] = useState("770816701");
  const [message, setMessage] = useState(
    "السلام عليكم ورحمة الله وبركاته\n\nيشرفنا دعوتكم لمشاركتنا فرحتنا"
  );
  const [imageReady, setImageReady] = useState(false);
  const [status, setStatus] = useState("");
  const [canInstall, setCanInstall] = useState(false);
  const [fontLoaded, setFontLoaded] = useState(false);

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
        // إذا لم يوجد خط Diwani.ttf سيستخدم التطبيق خط Aref Ruqaa
      }

      setFontLoaded(true);
    }

    loadFonts();
  }, []);

  const whatsappUrl = useMemo(() => {
    const normalized = normalizePhone(phone);
    const text = encodeURIComponent(message);
    return normalized ? `https://wa.me/${normalized}?text=${text}` : "";
  }, [phone, message]);

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

      const fittedSize = fitSingleLineFontSize(ctx, text, maxTextWidth, startSize, minSize);

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
      setStatus("إذا لم يظهر زر التثبيت، افتح قائمة المتصفح واختر: إضافة إلى الشاشة الرئيسية.");
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
    setStatus("تم تجهيز تحميل الصورة.");
  }

  async function shareImage() {
    const dataUrl = getPngDataUrl();
    if (!dataUrl) {
      setStatus("اكتب الاسم أولًا.");
      return;
    }

    const file = dataUrlToFile(dataUrl, "wedding-invitation.png");
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };

    if (navigator.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
      try {
        await navigator.share({
          title: "بطاقة دعوة",
          text: message,
          files: [file],
        });
        setStatus("تم فتح نافذة المشاركة. اختر واتساب ثم أرسل الدعوة.");
      } catch {
        setStatus("تم إلغاء المشاركة أو تعذرت من المتصفح.");
      }
    } else {
      setStatus("المتصفح لا يدعم مشاركة الصور مباشرة. استخدم زر تحميل الصورة ثم أرسلها من واتساب.");
    }
  }

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <Image src="/logo.png" alt="شعار التطبيق" width={48} height={48} className="brand-logo" />
          <div className="brand-title">
            <h1>تجهيز دعوات الزواج</h1>
            <p>اكتب الاسم فقط وستظهر الدعوة مباشرة</p>
          </div>
        

        {canInstall ? (
          <button className="install-btn" onClick={installApp}>
            تثبيت
          </button>
        ) : null}
      </header>

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
</div>

        <details className="compact-message">
          <summary>تعديل رسالة واتساب</summary>
          <textarea className="textarea compact-textarea" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
        </details>

        <details className="optional-template">
          <summary>تغيير قالب الدعوة</summary>
          <div className="field optional-upload">
            <input className="input" type="file" accept="image/*" onChange={handleTemplateUpload} />
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
        <button className="btn btn-primary" disabled={!imageReady} onClick={shareImage}>إرسال الدعوة</button>
        <button className="btn btn-outline" disabled={!imageReady} onClick={downloadImage}>تحميل الصورة</button>
      </div>

      <footer className="footer">
        تصميم وبرمجة أبو يماني
      </footer>
    </main>
  );
}
