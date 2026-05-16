// ── Initialize Lucide icons ──
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();

    // ── Scroll animation observer ──
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = entry.target.dataset.delay || 0;
                setTimeout(() => entry.target.classList.add('in-view'), parseInt(delay));
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));

    // ── Navbar scroll behaviour ──
    const nav = document.getElementById('main-nav');
    let lastY = 0;
    window.addEventListener('scroll', () => {
        const y = window.scrollY;
        nav.classList.toggle('scrolled', y > 50);
        nav.classList.toggle('nav-up', y > lastY && y > 400);
        lastY = y;
    }, { passive: true });

    // ── Mobile menu toggle ──
    const hamburger = document.getElementById('nav-hamburger');
    const mobileMenu = document.getElementById('mobile-menu');
    hamburger.addEventListener('click', () => {
        mobileMenu.classList.toggle('open');
        hamburger.classList.toggle('open');
    });
    mobileMenu.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
            mobileMenu.classList.remove('open');
            hamburger.classList.remove('open');
        });
    });

    // ── Smooth scroll ──
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            const t = document.querySelector(a.getAttribute('href'));
            if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        });
    });

    // ── CTA forms ──
    document.querySelectorAll('.cta-form').forEach(form => {
        form.addEventListener('submit', e => {
            e.preventDefault();
            const section = document.getElementById('cta');
            const grid = section.querySelector('.cta-grid');
            const success = document.getElementById('cta-success');
            grid.style.display = 'none';
            success.style.display = 'flex';
        });
    });

    // ── Parallax on hero visual (desktop only) ──
    const heroVisual = document.querySelector('.hero-visual');
    if (heroVisual && window.innerWidth > 900) {
        window.addEventListener('scroll', () => {
            if (window.scrollY < 900) {
                heroVisual.style.transform = `translateY(${window.scrollY * 0.06}px)`;
            }
        }, { passive: true });
    }
});
