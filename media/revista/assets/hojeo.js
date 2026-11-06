/* Línea de tiempo común del «Hojeo editorial» (6 s, bucle sin corte).
   0–1.2 s se arma la portada · 1.2–1.4 s quieta · 1.4–2.3 s gira la página ·
   2.3–4.9 s entran las fotos · 4.9–5.6 s se cierra · 5.6–6.0 s vuelve al fondo vacío.
   El fotograma 0 y el último muestran solo el fondo con su marco. */
window.construirHojeo = function construirHojeo(idComposicion) {
  const tl = gsap.timeline({ paused: true });
  const letras = gsap.utils.toArray("#cabecera .hj-letra");
  const fotos = gsap.utils.toArray(".hj-foto");
  const portada = [...letras, "#subtitulo", "#figura", "#linea-1", "#linea-2"];

  tl.fromTo(letras, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out", stagger: { amount: 0.5 } }, 0.1);
  tl.fromTo("#figura", { opacity: 0, scale: 1.12 }, { opacity: 1, scale: 1, duration: 0.9, ease: "power2.out" }, 0.2);
  tl.fromTo("#subtitulo", { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power1.out" }, 0.55);
  tl.fromTo(["#linea-1", "#linea-2"], { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.4, ease: "power2.out", stagger: 0.1 }, 0.7);

  tl.fromTo("#portada", { rotationY: 0, transformOrigin: "0% 50%" }, { rotationY: -110, duration: 0.9, ease: "power2.inOut" }, 1.4);
  tl.fromTo(fotos, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out", stagger: { amount: 0.6 } }, 2.3);

  tl.fromTo("#portada", { rotationY: -110 }, { rotationY: 0, duration: 0.7, ease: "power2.inOut", immediateRender: false }, 4.9);
  tl.fromTo(portada, { opacity: 1 }, { opacity: 0, duration: 0.35, ease: "power1.in", immediateRender: false }, 5.6);
  tl.fromTo(fotos, { opacity: 1 }, { opacity: 0, duration: 0.01, immediateRender: false }, 5.6);

  window.__timelines = window.__timelines || {};
  window.__timelines[idComposicion] = tl;
  tl.seek(0);
};
