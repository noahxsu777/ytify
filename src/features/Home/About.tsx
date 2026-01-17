export default function About() {
  const styles = {
    container: {
      "display": "flex",
      "justify-content": "center",
      "align-items": "center",
      "min-height": "70vh",
      "padding": "20px",
      "font-family": "system-ui, -apple-system, sans-serif",
    },
    card: {
      "background": "rgba(255, 255, 255, 0.03)",
      "backdrop-filter": "blur(12px)",
      "-webkit-backdrop-filter": "blur(12px)",
      "border": "1px solid rgba(255, 255, 255, 0.1)",
      "border-radius": "28px",
      "padding": "40px 30px",
      "max-width": "450px",
      "width": "100%",
      "text-align": "center",
      "box-shadow": "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
    },
    logoContainer: {
      "margin-bottom": "20px",
      "display": "inline-flex",
      "padding": "15px",
      "background": "linear-gradient(135deg, rgba(0,210,255,0.1) 0%, rgba(58,123,213,0.1) 100%)",
      "border-radius": "20px",
    },
    title: {
      "font-size": "2.8rem",
      "font-weight": "800",
      "margin": "0",
      "background": "linear-gradient(90deg, #00d2ff 0%, #3a7bd5 100%)",
      "-webkit-background-clip": "text",
      "-webkit-text-fill-color": "transparent",
      "letter-spacing": "-1px",
    },
    subtitle: {
      "font-size": "1.1rem",
      "color": "#00d2ff",
      "margin-top": "5px",
      "font-weight": "500",
      "letter-spacing": "2px",
      "text-transform": "uppercase",
    },
    text: {
      "color": "#a0a0a0",
      "line-height": "1.6",
      "font-size": "1.05rem",
      "margin": "25px 0",
    },
    button: {
      "display": "inline-block",
      "padding": "14px 32px",
      "background": "#fff",
      "color": "#000",
      "text-decoration": "none",
      "border-radius": "14px",
      "font-weight": "600",
    },
    footer: {
      "margin-top": "40px",
      "border-top": "1px solid rgba(255, 255, 255, 0.05)",
      "padding-top": "20px",
      "font-size": "0.85rem",
      "color": "#666",
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoContainer}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#00d2ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>

        <header>
          <h1 style={styles.title}>Sonic Boom</h1>
          <p style={styles.subtitle}>By Alliance Inside LLC</p>
        </header>

        <section>
          <p style={styles.text}>
            La nueva era del streaming de audio eficiente. 
            Disfruta de una biblioteca global ilimitada con tecnología optimizada para el rendimiento y la pureza sonora.
          </p>
        </section>

        <a href="#" style={styles.button}>
          Comenzar ahora
        </a>

        <footer style={styles.footer}>
          <p>© 2026 Alliance Inside LLC</p>
          <div style={{ "display": "flex", "justify-content": "center", "gap": "15px", "margin-top": "10px" }}>
            <a href="#" style={{ "color": "inherit", "text-decoration": "none" }}>Soporte</a>
            <a href="#" style={{ "color": "inherit", "text-decoration": "none" }}>Privacidad</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
