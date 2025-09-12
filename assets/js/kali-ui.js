if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const links = document.querySelectorAll('.wswitch a[href^="#"]');
    const sections = Array.from(links)
      .map((link) => document.querySelector(link.getAttribute('href')))
      .filter(Boolean);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          links.forEach((link) => {
            if (link.getAttribute('href') === `#${entry.target.id}`) {
              link.setAttribute('aria-current', 'true');
            } else {
              link.removeAttribute('aria-current');
            }
          });
        }
      });
    });

    sections.forEach((section) => observer.observe(section));
  });
}
