
"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

type FontWeight = "400" | "700";

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

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [templateUrl, setTemplateUrl] = useState("");
  const [guestName, setGuestName] = useState("الأخ / أحمد سالم عبدالله");
  const [phone, setPhone] = useState("777111111");
  const [message, setMessage] = useState("السلام عليكم ورحمة الله وبركاته\nيشرفنا دعوتكم لحضور حفل الزواج.\nمرفق لكم بطاقة الدعوة.");
  const [xPercent, setXPercent] = useState(50);
  const [yPercent, setYPercent] = useState(58);
  const [fontSize, setFontSize] = useState(54);
  const [fontColor, setFontColor] = useState("#6F1D1B");
  const [fontWeight, setFontWeight] = useState<FontWeight>("700");
  const [boxWidthPercent, setBoxWidthPercent] = useState(78);
  const [lineHeight, setLineHeight] = useState(1.35);
  const [imageReady, setImageReady] = useState(false);
  const [status, setStatus] = useState("");

  const whatsappUrl = useMemo(() => {
    const normalized = normalizePhone(phone);
    const text = encodeURIComponent(message);
    return normalized ? `https://wa.me/${normalized}?text=${text}` : "";
  }, [phone, message]);

  function handleTemplateUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus("الملف المرفوع ليس صورة.");
      return;
    }
    const url = URL.createObjectURL(file);
    setTemplateUrl(url);
    setStatus("تم رفع القالب. يمكنك الآن تعديل مكان الاسم.");
  }

  useEffect(() => {
    if (!templateUrl) { setImageReady(false); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new Image();
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
      ctx.shadowColor = "rgba(255,255,255,0.9)";
      ctx.shadowBlur = Math.round(8 * scale);
      lines.forEach((line, index) => ctx.fillText(line, x, y - totalHeight / 2 + index * lineGap));
      ctx.restore();
      setImageReady(true);
    };
    img.onerror = () => { setImageReady(false); setStatus("تعذر تحميل صورة القالب. جرّب صورة أخرى."); };
    img.src = templateUrl;
  }, [templateUrl, guestName, xPercent, yPercent, fontSize, fontColor, fontWeight, boxWidthPercent, lineHeight]);

  function getPngDataUrl() {
    const canvas = canvasRef.current;
    if (!canvas || !imageReady) return null;
    return canvas.toDataURL("image/png", 1);
  }

  function downloadImage() {
    const dataUrl = getPngDataUrl();
    if (!dataUrl) { setStatus("ارفع قالب الدعوة أولاً."); return; }
    const link = document.createElement("a");
    const safeName = guestName.replace(/[\\/:*?"<>|]/g, "").slice(0, 60);
    link.download = `دعوة - ${safeName || "مدعو"}.png`;
    link.href = dataUrl;
    link.click();
    setStatus("تم تجهيز تحميل الصورة.");
  }

  async function shareImage() {
    const dataUrl = getPngDataUrl();
    if (!dataUrl) { setStatus("ارفع قالب الدعوة أولاً."); return; }
    const file = dataUrlToFile(dataUrl, "wedding-invitation.png");
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    if (navigator.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
      try {
        await navigator.share({ title: "دعوة زواج", text: message, files: [file] });
        setStatus("تم فتح نافذة المشاركة. اختر WhatsApp ثم أرسل.");
      } catch {
        setStatus("تم إلغاء المشاركة أو تعذرت من المتصفح.");
      }
    } else {
      setStatus("المتصفح لا يدعم مشاركة الصور مباشرة. استخدم تحميل الصورة ثم أرسلها من واتساب.");
    }
  }

  function openWhatsApp() {
    if (!whatsappUrl) { setStatus("اكتب رقم الجوال أولاً."); return; }
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  function resetPosition() {
    setXPercent(50); setYPercent(58); setFontSize(54); setBoxWidthPercent(78); setLineHeight(1.35); setFontColor("#6F1D1B"); setFontWeight("700");
  }

  return (
    <main className="page">
      <div className="shell">
        <section className="hero">
          <h1>مولّد دعوات الزواج عبر واتساب</h1>
          <p>ارفع قالب الدعوة، اكتب اسم المدعو ورقم الجوال، ثم حمّل الصورة أو شاركها مباشرة. كل المعالجة تتم داخل المتصفح.</p>
        </section>
        <section className="grid">
          <div className="card">
            <h2>بيانات الدعوة</h2>
            <div className="field"><label>صورة قالب الدعوة</label><input className="input" type="file" accept="image/*" onChange={handleTemplateUpload}/><small>استخدم صورة PNG أو JPG، واجعل مكان الاسم فارغًا في التصميم.</small></div>
            <div className="field"><label>اسم المدعو</label><input className="input" value={guestName} onChange={(e)=>setGuestName(e.target.value)} placeholder="مثال: الشيخ / أحمد سالم"/></div>
            <div className="field"><label>رقم واتساب</label><input className="input" value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="777111111 أو 967777111111" dir="ltr"/><small>إذا كتبت رقم يمني 9 أرقام يبدأ بـ 7، سيضيف التطبيق 967 تلقائيًا.</small></div>
            <div className="field"><label>رسالة واتساب</label><textarea className="input" rows={5} value={message} onChange={(e)=>setMessage(e.target.value)}/><small>رابط wa.me لا يرفق الصورة تلقائيًا، لذلك استخدم زر مشاركة الصورة.</small></div>
            <h2>مكان وشكل الاسم</h2>
            <div className="row"><div className="field"><label>الموقع الأفقي X</label><div className="range-wrap"><input type="range" min="0" max="100" value={xPercent} onChange={(e)=>setXPercent(Number(e.target.value))}/><input className="input" value={xPercent} onChange={(e)=>setXPercent(Number(e.target.value))} dir="ltr"/></div></div><div className="field"><label>الموقع الرأسي Y</label><div className="range-wrap"><input type="range" min="0" max="100" value={yPercent} onChange={(e)=>setYPercent(Number(e.target.value))}/><input className="input" value={yPercent} onChange={(e)=>setYPercent(Number(e.target.value))} dir="ltr"/></div></div></div>
            <div className="row"><div className="field"><label>حجم الخط</label><input className="input" type="number" value={fontSize} onChange={(e)=>setFontSize(Number(e.target.value))} min="10" max="160" dir="ltr"/></div><div className="field"><label>عرض الاسم</label><input className="input" type="number" value={boxWidthPercent} onChange={(e)=>setBoxWidthPercent(Number(e.target.value))} min="20" max="100" dir="ltr"/></div></div>
            <div className="row"><div className="field"><label>سماكة الخط</label><select className="select" value={fontWeight} onChange={(e)=>setFontWeight(e.target.value as FontWeight)}><option value="400">عادي</option><option value="700">عريض</option></select></div><div className="field"><label>لون الخط</label><div className="color-row"><input className="input" value={fontColor} onChange={(e)=>setFontColor(e.target.value)} dir="ltr"/><input type="color" value={fontColor} onChange={(e)=>setFontColor(e.target.value)}/></div></div></div>
            <div className="field"><label>تباعد الأسطر</label><input className="input" type="number" step="0.05" value={lineHeight} onChange={(e)=>setLineHeight(Number(e.target.value))} min="1" max="2.5" dir="ltr"/></div>
            <div className="actions"><button className="btn btn-secondary" onClick={resetPosition}>إعادة ضبط مكان الاسم</button><button className="btn btn-primary" disabled={!imageReady} onClick={shareImage}>مشاركة الصورة</button><button className="btn btn-outline" disabled={!imageReady} onClick={downloadImage}>تحميل الصورة</button><button className="btn btn-secondary" onClick={openWhatsApp}>فتح واتساب للرقم</button></div>
            {status ? <div className="notice">{status}</div> : null}
            <p className="footer-note">للاستخدام الأسرع: اضبط مكان الاسم مرة واحدة، ثم غيّر الاسم والرقم واضغط مشاركة أو تحميل.</p>
          </div>
          <div className="card"><h2>معاينة الصورة الناتجة</h2><div className="preview-area">{templateUrl ? <canvas ref={canvasRef}/> : <div className="placeholder"><strong>ارفع قالب الدعوة أولاً</strong><br/>ستظهر هنا الصورة بعد إضافة اسم المدعو.</div>}</div></div>
        </section>
      </div>
    </main>
  );
}
