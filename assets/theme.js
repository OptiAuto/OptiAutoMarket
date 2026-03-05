/**
 * OptiAuto Market - Theme JavaScript
 */

document.addEventListener('DOMContentLoaded', function() {
  // Mobile menu toggle
  const menuToggle = document.querySelector('.header__menu-toggle');
  const nav = document.querySelector('.header__nav');
  if (menuToggle && nav) {
    menuToggle.addEventListener('click', function() {
      const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', !expanded);
      nav.classList.toggle('is-open');
    });
  }

  // Product image gallery - thumb click
  document.querySelectorAll('.product-main__thumb').forEach(function(thumb) {
    thumb.addEventListener('click', function() {
      const mainImage = document.querySelector('.product-main__image-main img');
      const src = thumb.getAttribute('data-src');
      if (mainImage && src) {
        mainImage.src = src;
      }
      document.querySelectorAll('.product-main__thumb').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
  });
});
