// Réduit une image choisie par l'artisan (logo) : 300 px au plus, PNG si l'original a de la transparence, sinon JPEG
export async function reduireLogo(fichier: File, cote = 300, maxOctets = 190_000): Promise<string> {
  if (!/^image\/(png|jpeg|webp)$/.test(fichier.type)) throw new Error('Choisissez une image PNG ou JPEG.');
  const url = URL.createObjectURL(fichier);
  try {
    const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error('Image illisible.')); i.src = url; });
    const k = Math.min(1, cote / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    let sortie = c.toDataURL(fichier.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.88);
    for (let q = 0.8; sortie.length > maxOctets && q > 0.3; q -= 0.15) sortie = c.toDataURL('image/jpeg', q);
    if (sortie.length > maxOctets) throw new Error('Image trop lourde, même réduite.');
    return sortie;
  } finally { URL.revokeObjectURL(url); }
}

export function telecharger(nom: string, contenu: string, type = 'application/json') {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([contenu], { type })); a.download = nom; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
