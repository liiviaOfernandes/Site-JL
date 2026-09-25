const LINKS = {
  instagram: "https://www.instagram.com/joselivia.fotografia/",
  whatsapp: "https://wa.me/message/YHY CNC54YVI5M1".replace(/\s/g, "")
};

document.querySelectorAll("[data-link]").forEach((el) => {
  const url = LINKS[el.dataset.link];
  if (url) el.href = url;
});

document.getElementById("year").textContent = new Date().getFullYear();
