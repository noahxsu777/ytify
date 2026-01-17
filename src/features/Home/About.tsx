export default function About() {
  return (
    <div class="sonic-page">
      <style>{`
        .sonic-page {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 80vh;
          padding: 20px;
          font-family: 'Inter', -apple-system, sans-serif;
          color: white;
        }

        .sonic-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(15px);
          -webkit-backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 32px;
          padding: 50px 30px;
          max-width: 480px;
          width: 100%;
          text-align: center;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
        }

        .sonic-icon-wrapper {
          background: linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%);
          width: 70px;
          height: 70px;
          border-radius: 22px;
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 0 auto 25px auto;
          box-shadow: 0 10px 20px rgba(0, 210, 255, 0.3);
        }

        .sonic-title {
          font-size: 3rem;
          font-weight: 900;
          margin: 0;
          letter-spacing: -1.5px;
          background: linear-gradient(to right, #ffffff, #a0a0a0);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .sonic-branding {
          font-size: 1.1rem;
          color: #00d2ff;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-top: 5px;
        }

        .sonic-description {
          font-size: 1.1rem;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.7);
          margin: 30px 0;
        }

        .sonic-main-btn {
          display: inline-block;
          background: white;
          color: black !important;
          padding: 16px 40px;
          border-radius: 16px;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.3s ease;
          box-shadow: 0 10px 20px rgba(255, 255, 255, 0.1);
        }

        .sonic-main-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 15px 30px rgba(255, 255, 255, 0.2);
        }

        .sonic-divider {
          border: 0;
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          margin: 40px 0 25px 0;
        }

        .sonic-footer {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.4);
        }

        .sonic-footer-links {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-top: 15px;
        }

        .sonic-footer-links a {
          color: rgba(255, 255, 255, 0.6);
          text-decoration: none;
          transition: color 0.2s;
        }

        .sonic-footer-links a:hover {
          color: #00d2ff;
        }
      `}</style>

      <div class="sonic-card">
        <div class="sonic-icon-wrapper">
          <svg width="35" height="35" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 22h2c5.523 0 10-4.477 10-10S18.523 2 13 2H11C5.477 2 1 6.477 1 12s4.477 10 10 10z"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
        </div>

        <header>
          <h1 class="sonic-title">Sonic Boom</h1>
          <p class="sonic-branding">By Alliance Inside LLC</p>
        </header>

        <section>
          <p class="sonic-description">
            Experimenta el streaming de audio de alto rendimiento. 
            <strong>Sonic Boom</strong> optimiza cada bit para ofrecerte una calidad superior con el mínimo consumo energético.
          </p>
        </section>

        <a href="#" class="sonic-main-btn">
          Comenzar ahora
        </a>

        <hr class="sonic-divider" />

        <footer class="sonic-footer">
          <p>© 2026 Alliance Inside LLC. All rights reserved.</p>
          <nav class="sonic-footer-links">
            <a href="#">Soporte</a>
            <a href="#">Términos</a>
            <a href="#">Privacidad</a>
          </nav>
        </footer>
      </div>
    </div>
  );
}
