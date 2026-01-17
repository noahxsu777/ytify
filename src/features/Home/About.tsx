export default function About() {
  const styles = {
    container: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '70vh',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    card: {
      background: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '28px',
      padding: '40px 30px',
      maxWidth: '450px',
      width: '100%',
      textAlign: 'center',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    },
    logoContainer: {
      marginBottom: '20px',
      display: 'inline-flex',
      padding: '15px',
      background: 'linear-gradient(135deg, rgba(0,210,255,0.1) 0%, rgba(58,123,213,0.1) 100%)',
      borderRadius: '20px',
    },
    title: {
      fontSize: '2.8rem',
      fontWeight: '800',
      margin: '0',
      background: 'linear-gradient(90deg, #00d2ff 0%, #3a7bd5 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      letterSpacing: '-1px',
    },
    subtitle: {
      fontSize: '1.1rem',
      color: '#00d2ff',
      marginTop: '5px',
      fontWeight: '500',
      letterSpacing: '2px',
      textTransform: 'uppercase' as const,
    },
    text: {
      color: '#a0a0a0',
      lineHeight: '1.6',
      fontSize: '1.05rem',
      margin: '25px 0',
    },
    button: {
      display: 'inline-block',
      padding: '14px 32px',
      background: '#fff',
      color: '#000',
      textDecoration: 'none',
      borderRadius: '14px',
      fontWeight: '600',
      transition: 'all 0.3s ease',
    },
    footer: {
      marginTop: '40px',
      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
      paddingTop: '20px',
      fontSize: '0.85rem',
      color: '#666',
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
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '10px' }}>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Soporte</a>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacidad</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
