"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

type FontWeight = "400" | "700";

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  }

  interface Window {
    deferredPrompt?: BeforeInstallPromptEvent | null;
  }
}

function normalizePhone(phone: string) {
  let value = String(phone || "").trim().replace(/[^\d]/g, "");
  if (value.startsWith("00")) value = value.slice(2);
  if (value.startsWith("0")) value = value.slice(1);
  if (value.length === 9 && value.startsWith("7")) value = `967${value}`;
  return value;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }

  if (current) lines.push(current);
  return lines.slice(0, 3);
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

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M19.11 17.39c-.28-.14-1.63-.8-1.89-.89-.25-.09-.43-.14-.62.14-.18.28-.71.89-.87 1.07-.16.18-.32.21-.6.07-.28-.14-1.16-.43-2.21-1.38-.81-.72-1.35-1.6-1.51-1.88-.16-.28-.02-.43.12-.57.12-.12.28-.32.42-.48.14-.16.18-.28.28-.46.09-.18.05-.35-.02-.48-.07-.14-.62-1.48-.85-2.03-.22-.52-.45-.45-.62-.46h-.53c-.18 0-.48.07-.74.35s-.96.94-.96 2.28c0 1.35.98 2.65 1.12 2.83.14.18 1.93 2.95 4.68 4.13.66.28 1.18.45 1.59.58.67.21 1.28.18 1.76.11.54-.08 1.63-.67 1.86-1.31.23-.64.23-1.19.16-1.31-.07-.11-.25-.18-.53-.32Z" />
      <path d="M27.27 4.71A15.83 15.83 0 0 0 16.03.06C7.29.06.16 7.19.16 15.94c0 2.79.73 5.52 2.11 7.93L0 31.94l8.28-2.18a15.88 15.88 0 0 0 7.75 1.98h.01c8.74 0 15.87-7.13 15.87-15.87 0-4.24-1.65-8.23-4.64-11.16Zm-11.24 24.3h-.01a13.3 13.3 0 0 1-6.78-1.86l-.49-.29-4.92 1.29 1.31-4.8-.32-.49a13.26 13.26 0 0 1-2.03-7.08c0-7.33 5.96-13.29 13.29-13.29 3.54 0 6.87 1.38 9.37 3.87 2.5 2.5 3.88 5.83 3.88 9.37-.01 7.33-5.97 13.29-13.3 13.29Z" />
    </svg>
  );
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [templateUrl, setTemplateUrl] = useState("");
  const [guestName, setGuestName] = useState("الأخ / أحمد سالم عبدالله");
  const [phone, setPhone] = useState("777111111");
  const [message, setMessage] = useState(
    "السلام عليكم ورحمة الله وبركاته\\nيشرفنا دعوتكم لحضور حفل الزواج.\\nمرفق لكم بطاقة الدعوة."
  );
  const [xPercent, setXPercent] = useState(50);
  const [yPercent, setYPercent] = useState(58);
  const [fontSize, setFontSize] = useState(54);
  const [fontColor, setFontColor] = useState("#6F1D1B");
  const [fontWeight, setFontWeight] = useState<FontWeight>("700");
  const [boxWidthPercent, setBoxWidthPercent] = useState(78);
  const [lineHeight, setLineHeight] = useState(1.35);
  const [imageReady, setImageReady] = useState(false);
  const [status, setStatus] = useState("");
  const [canInstall, setCanInstall] = useState(false);

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
    setStatus("تم رفع القالب بنجاح. يمكنك الآن تعديل مكان الاسم حسب التصميم.");
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
      const maxCanvasWidth = 1600;
      const scale = img.width > maxCanvasWidth ? maxCanvasWidth / img.width : 1;
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const computedFontSize = Math.max(12, Math.round(fontSize * scale));
      ctx.font = `${fontWeight} ${computedFontSize}px Arial, Tahoma, sans-serif`;
      ctx.fillStyle = fontColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.direction = "rtl";

      const maxTextWidth = width * (boxWidthPercent / 100);
      const lines = wrapText(ctx, guestName, maxTextWidth);
      const x = width * (xPercent / 100);
      const y = height * (yPercent / 100);
      const lineGap = computedFontSize * lineHeight;
      const totalHeight = (lines.length - 1) * lineGap;

      ctx.save();
      ctx.shadowColor = "rgba(255,255,255,0.95)";
      ctx.shadowBlur = Math.round(12 * scale);
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      lines.forEach((line, index) => {
        ctx.fillText(line, x, y - totalHeight / 2 + index * lineGap);
      });
      ctx.restore();

      setImageReady(true);
    };

    img.onerror = () => {
      setImageReady(false);
      setStatus("تعذر تحميل صورة القالب. جرّب صورة أخرى.");
    };

    img.src = templateUrl;
  }, [templateUrl, guestName, xPercent, yPercent, fontSize, fontColor, fontWeight, boxWidthPercent, lineHeight]);

  async function installApp() {
    if (!window.deferredPrompt) {
      setStatus("إذا لم يظهر زر التثبيت على جهازك، افتح قائمة المتصفح ثم اختر: إضافة إلى الشاشة الرئيسية.");
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
      setStatus("ارفع قالب الدعوة أولًا.");
      return;
    }
    const link = document.createElement("a");
    const safeName = guestName.replace(/[\/:*?"<>|]/g, "").slice(0, 60);
    link.download = `دعوة - ${safeName || "مدعو"}.png`;
    link.href = dataUrl;
    link.click();
    setStatus("تم تجهيز تحميل الصورة.");
  }

  async function shareImage() {
    const dataUrl = getPngDataUrl();
    if (!dataUrl) {
      setStatus("ارفع قالب الدعوة أولًا.");
      return;
    }
    const file = dataUrlToFile(dataUrl, "wedding-invitation.png");
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };

    if (navigator.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
      try {
        await navigator.share({
          title: "دعوة زواج",
          text: message,
          files: [file],
        });
        setStatus("تم فتح نافذة المشاركة. اختر واتساب لإرسال الصورة.");
      } catch {
        setStatus("تم إلغاء المشاركة أو تعذرت من المتصفح.");
      }
    } else {
      setStatus("المتصفح لا يدعم مشاركة الصور مباشرة. استخدم زر تحميل الصورة ثم أرسلها من واتساب.");
    }
  }

  function openWhatsApp() {
    if (!whatsappUrl) {
      setStatus("اكتب رقم الجوال أولًا.");
      return;
    }
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  function resetPosition() {
    setXPercent(50);
    setYPercent(58);
    setFontSize(54);
    setBoxWidthPercent(78);
    setLineHeight(1.35);
    setFontColor("#6F1D1B");
    setFontWeight("700");
    setStatus("تمت إعادة الضبط.");
  }

  return (
    <main className="app-shell">
      <div className="topbar">
        <div className="brand">
          <Image src="/logo.png" alt="شعار أبو يماني" width={54} height={54} className="brand-logo" />
          <div className="brand-title">
            <h1>تجهيز دعوات الزواج</h1>
            <p>واجهة عملية وسريعة لتخصيص بطاقة الدعوة ومشاركتها</p>
          </div>
        </div>
        {canInstall ? (
          <button className="install-btn" onClick={installApp}>تثبيت التطبيق</button>
        ) : null}
      </div>

      <section className="hero-card">
        <div className="hero-copy">
          <div className="hero-copy-text">
            <h2>جهّز بطاقة الدعوة خلال ثوانٍ</h2>
            <p>
              ارفع القالب، اكتب اسم المدعو ورقم الجوال، ثم حمّل الصورة أو شاركها بسهولة.
              تم تصميم الواجهة لتكون مناسبة للجوال ويمكن تثبيتها كتطبيق على أندرويد.
            </p>
          </div>
          <div className="developer-badge">
            <Image src="/logo.png" alt="أبو يماني" width={34} height={34} />
            <span>تصميم وبرمجة أبو يماني</span>
          </div>
        </div>
      </section>

      <section className="layout-grid">
        <div className="card">
          <h3>بيانات الدعوة</h3>

          <div className="panel">
            <div className="field">
              <label>قالب الدعوة</label>
              <input className="input" type="file" accept="image/*" onChange={handleTemplateUpload} />
              <small className="field-help">اختر صورة الدعوة، ويفضل أن تكون مساحة الاسم واضحة داخل التصميم.</small>
            </div>

            <div className="field">
              <label>اسم المدعو</label>
              <input className="input" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
            </div>

            <div className="field">
              <label>رقم الجوال</label>
              <input className="input" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="777111111" />
              <small className="field-help">للأرقام اليمنية: إذا أدخلت 9 أرقام تبدأ بـ 7 فسيتم تحويلها تلقائيًا إلى صيغة دولية.</small>
            </div>

            <div className="field">
              <label>رسالة واتساب</label>
              <textarea className="textarea" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
          </div>

          <div className="section-title">إعدادات الاسم على القالب</div>
          <div className="panel">
            <div className="two-col">
              <div className="field">
                <label>الموقع الأفقي X</label>
                <div className="range-grid">
                  <input type="range" min="0" max="100" value={xPercent} onChange={(e) => setXPercent(Number(e.target.value))} />
                  <input className="input" dir="ltr" value={xPercent} onChange={(e) => setXPercent(Number(e.target.value))} />
                </div>
              </div>
              <div className="field">
                <label>الموقع الرأسي Y</label>
                <div className="range-grid">
                  <input type="range" min="0" max="100" value={yPercent} onChange={(e) => setYPercent(Number(e.target.value))} />
                  <input className="input" dir="ltr" value={yPercent} onChange={(e) => setYPercent(Number(e.target.value))} />
                </div>
              </div>
            </div>

            <div className="two-col">
              <div className="field">
                <label>حجم الخط</label>
                <input className="input" type="number" dir="ltr" value={fontSize} min="10" max="160" onChange={(e) => setFontSize(Number(e.target.value))} />
              </div>
              <div className="field">
                <label>عرض النص</label>
                <input className="input" type="number" dir="ltr" value={boxWidthPercent} min="20" max="100" onChange={(e) => setBoxWidthPercent(Number(e.target.value))} />
              </div>
            </div>

            <div className="two-col">
              <div className="field">
                <label>سماكة الخط</label>
                <select className="select" value={fontWeight} onChange={(e) => setFontWeight(e.target.value as FontWeight)}>
                  <option value="400">عادي</option>
                  <option value="700">عريض</option>
                </select>
              </div>
              <div className="field">
                <label>لون الخط</label>
                <div className="color-grid">
                  <input className="input" dir="ltr" value={fontColor} onChange={(e) => setFontColor(e.target.value)} />
                  <input type="color" value={fontColor} onChange={(e) => setFontColor(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="field">
              <label>تباعد الأسطر</label>
              <input className="input" type="number" step="0.05" min="1" max="2.5" dir="ltr" value={lineHeight} onChange={(e) => setLineHeight(Number(e.target.value))} />
            </div>
          </div>

          <div className="actions">
            <button className="btn btn-secondary" onClick={resetPosition}>إعادة ضبط الإعدادات</button>
            <button className="btn btn-primary" disabled={!imageReady} onClick={shareImage}>مشاركة الصورة</button>
            <button className="btn btn-outline" disabled={!imageReady} onClick={downloadImage}>تحميل الصورة</button>
            <button className="btn btn-secondary" onClick={openWhatsApp}>فتح واتساب للرقم</button>
          </div>

          {status ? <div className="status">{status}</div> : null}
        </div>

        <div className="card preview-shell">
          <div className="preview-header">
            <div>
              <h3>المعاينة</h3>
              <div className="preview-meta">ستظهر البطاقة النهائية هنا بعد رفع القالب.</div>
            </div>
            <div className="chip-row">
              <div className="chip">جاهز للجوال</div>
              <div className="chip">قابل للتثبيت</div>
              <div className="chip">مشاركة سريعة</div>
            </div>
          </div>
          <div className="preview-stage">
            {templateUrl ? (
              <canvas ref={canvasRef} />
            ) : (
              <div className="placeholder">
                <strong>ارفع قالب الدعوة أولًا</strong>
                <br />
                بعد ذلك ستظهر البطاقة هنا مباشرة مع الاسم.
              </div>
            )}
          </div>
          <div className="footer">تصميم وبرمجة أبو يماني</div>
        </div>
      </section>

      <a
        className="whatsapp-float"
        href="https://wa.me/967770816701?text=%D8%A7%D9%84%D8%B3%D9%84%D8%A7%D9%85%20%D8%B9%D9%84%D9%8A%D9%83%D9%85%D8%8C%20%D8%A3%D8%B1%D8%BA%D8%A8%20%D8%A8%D8%A7%D9%84%D8%AA%D9%88%D8%A7%D8%B5%D9%84%20%D8%A8%D8%AE%D8%B5%D9%88%D8%B5%20%D8%AA%D8%B7%D8%A8%D9%8A%D9%82%20%D8%AF%D8%B9%D9%88%D8%A7%D8%AA%20%D8%A7%D9%84%D8%B2%D9%88%D8%A7%D8%AC"
        target="_blank"
        rel="noreferrer"
        aria-label="التواصل عبر واتساب"
        title="التواصل عبر واتساب"
      >
        <WhatsAppIcon />
      </a>
    </main>
  );
}
