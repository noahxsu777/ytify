export default function About() {
  return (
    <div class="sonic-wrapper">
      <style>{`
        /* Reset de contenedor para que encaje en la web */
        .sonic-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          min-height: 90vh;
          padding: 20px;
          box-sizing: border-box;
          font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }

        .sonic-card {
          background: rgba(15, 15, 20, 0.8);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 30px;
          padding: 50px 40px;
          max-width: 500px;
          width: 100%;
          text-align: center;
          box-shadow: 0 40px 100px rgba(0, 0, 0, 0.6);
          color: #ffffff;
        }

        .sonic-logo-circle {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #00d2ff, #3a7bd5);
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 0 auto 25px auto;
          box-shadow: 0 0 30px rgba(0, 210, 255, 0.4);
        }

        .sonic-title {
          font-size: 2.8rem;
          font-weight: 800;
          margin: 0;
          background: linear-gradient(to bottom, #ffffff 30%, #a0a0a0 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -1px;
        }

        .sonic-brand {
          font-size: 1rem;
          color: #00d2ff;
          text-transform: uppercase;
          letter-spacing: 3px;
          font-weight: 700;
          margin-top: 10px;
          display: block;
        }

        .sonic-description {
          font-size: 1.1rem;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.7);
          margin: 30px 0;
        }

        .sonic-btn {
          display: inline-block;
          width: 100%;
          max-width: 250px;
          padding: 15px;
          background: #ffffff;
          color: #000000 !important;
          border-radius: 50px;
          font-weight: 700;
          text-decoration: none;
          font-size: 1rem;
          transition: all 0.3s ease;
          border: none;
          cursor: pointer;
        }

        .sonic-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 25px rgba(255, 255, 255, 0.2);
          background: #f0f0f0;
        }

        .sonic-footer-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          margin: 40px 0 20px 0;
          border: none;
        }

        .sonic-copy {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.4);
          margin: 0;
        }

        .sonic-links {
          margin-top: 15px;
          display: flex;
          justify-content: center;
          gap: 20px;
        }

        .sonic-links a {
          color: rgba(255, 255, 255, 0.6);
          text-decoration: none;
          font-size: 0.85rem;
          transition: color 0.2s;
        }

        .sonic-links a:hover {
          color: #00d2ff;
        }

        /* Ajuste para móviles */
        @media (max-width: 480px) {
          .sonic-card {
            padding: 30px 20px;
          }
          .sonic-title {
            font-size: 2.2rem;
          }
        }
      `}</style>

      <div class="sonic-card">
        <div class="sonic-logo-circle">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 22h2c5.523 0 10-4.477 10-10S18.523 2 13 2H11C5.477 2 1 6.477 1 12s4.477 10 10 10z"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
        </div>

        <h1 class="sonic-title">Sonic Boom</h1>
        <span class="sonic-brand">By Alliance Inside LLC</span>

        <p class="sonic-description">
          La evolución del streaming eficiente. Música ilimitada con la potencia de la red global, optimizada para ofrecerte una experiencia de audio pura y sin interrupciones.
        </p>

        <a href="#" class="sonic-btn">Comenzar ahora</a>

        <hr class="sonic-footer-divider" />

        <footer class="sonic-footer">
          <p class="sonic-copy">© 2026 Alliance Inside LLC</p>
          <div class="sonic-links">
            <a href="#">Soporte</a>
            <a href="#">Privacidad</a>
            <a href="#">Términos</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
