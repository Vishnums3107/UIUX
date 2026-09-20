const formatDate = (dateInput = new Date()) => {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    }).format(date);
};

const sanitizeFilePart = (value = '') => String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'learner';

export function generateFluencyCertificate({ userName = 'Learner', date = new Date() } = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1100;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const formattedDate = formatDate(date);

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(0.5, '#1e293b');
    gradient.addColorStop(1, '#0b1120');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(59, 130, 246, 0.16)';
    ctx.fillRect(56, 56, canvas.width - 112, canvas.height - 112);

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 8;
    ctx.strokeRect(80, 80, canvas.width - 160, canvas.height - 160);

    ctx.strokeStyle = 'rgba(147, 197, 253, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(105, 105, canvas.width - 210, canvas.height - 210);

    ctx.fillStyle = '#dbeafe';
    ctx.font = '700 60px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('Tamil Fluency Certificate', canvas.width / 2, 250);

    ctx.fillStyle = '#bfdbfe';
    ctx.font = '500 34px Georgia';
    ctx.fillText('தமிழ் கற்போம் - தேர்ச்சி சான்றிதழ்', canvas.width / 2, 310);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '400 30px Georgia';
    ctx.fillText('This certifies that', canvas.width / 2, 420);

    ctx.fillStyle = '#f0f9ff';
    ctx.font = '700 72px Georgia';
    ctx.fillText(userName, canvas.width / 2, 510);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '400 30px Georgia';
    ctx.fillText('has successfully completed all 10 stages of Tamil learning', canvas.width / 2, 585);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '400 28px Georgia';
    ctx.fillText(`Awarded on ${formattedDate}`, canvas.width / 2, 700);

    ctx.fillStyle = '#2563eb';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 840, 78, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#eff6ff';
    ctx.font = '700 24px Georgia';
    ctx.fillText('OFFICIAL', canvas.width / 2, 832);
    ctx.fillText('SEAL', canvas.width / 2, 865);

    const slug = sanitizeFilePart(userName);
    return {
        dataUrl: canvas.toDataURL('image/png'),
        formattedDate,
        fileName: `tamil-fluency-certificate-${slug}.png`
    };
}

export default generateFluencyCertificate;