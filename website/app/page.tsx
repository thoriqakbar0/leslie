import Image from "next/image";

const downloadUrl = "https://github.com/thoriqakbar0/leslie/releases/latest";

const Arrow = () => <span aria-hidden="true">↗</span>;

export default function Home() {
  return (
    <main>
      <nav className="site-nav" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="Leslie home">
          <Image src="/leslie-mark.png" alt="" width={48} height={32} />
          <span>Leslie</span>
        </a>
        <div className="nav-links">
          <a href="#why">Why Leslie</a>
          <a href="#how">How it works</a>
          <a className="nav-download" href={downloadUrl}>
            Get the beta <Arrow />
          </a>
        </div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">
            <span /> A local-first work log for macOS
          </p>
          <h1>Make peace with what got done.</h1>
          <p className="hero-lede">
            Leslie keeps planned work and factual work logs side by side, so a changing day does not
            erase your progress.
          </p>
          <div className="hero-actions">
            <a className="primary-button" href={downloadUrl}>
              Download the macOS beta <Arrow />
            </a>
            <a className="text-link" href="#how">
              See how it works <span aria-hidden="true">↓</span>
            </a>
          </div>
          <p className="privacy-line">Private by default · No account · Your data stays local</p>
        </div>

        <div className="hero-orbit" aria-hidden="true">
          <span className="orbit orbit-one" />
          <span className="orbit orbit-two" />
          <span className="orbit-dot" />
          <div className="day-card">
            <p>today</p>
            <strong>3</strong>
            <span>things moved forward</span>
          </div>
        </div>
      </section>

      <section className="product-stage" aria-label="Leslie application preview">
        <div className="stage-label">
          <span>One calm place</span>
          <span>for the day you actually had</span>
        </div>
        <div className="screenshot-shell">
          <Image
            src="/leslie-app.png"
            alt="Leslie showing two planned tasks and a factual timeline entry"
            width={2200}
            height={1520}
            sizes="(max-width: 680px) 900px, (max-width: 1440px) 90vw, 1280px"
            priority
          />
        </div>
      </section>

      <section className="manifesto" id="why">
        <p className="section-kicker">The idea</p>
        <div className="manifesto-grid">
          <h2>Your plan is a direction. Your work log is the record.</h2>
          <div className="manifesto-copy">
            <p>
              Most task apps only remember what you promised. Leslie remembers what happened,
              including the useful work that arrived unplanned.
            </p>
            <p>
              There are no streaks, scores, or red overdue counts. Just a clear place to plan, work,
              and look back with honest evidence.
            </p>
          </div>
        </div>
      </section>

      <section className="features" aria-label="Leslie features">
        <article className="feature-card coral-card">
          <span className="feature-number">01</span>
          <div>
            <h3>Plan without making promises.</h3>
            <p>Capture the next thing, add a time estimate, and keep it visible.</p>
          </div>
          <div className="mini-plan" aria-hidden="true">
            <span className="mini-check" />
            <span className="mini-line" />
            <span className="mini-time">30 min</span>
          </div>
        </article>

        <article className="feature-card cream-card">
          <span className="feature-number">02</span>
          <div>
            <h3>Record the work that appeared.</h3>
            <p>Log what you did directly. The timeline keeps the day factual.</p>
          </div>
          <div className="mini-log" aria-hidden="true">
            <span>09:12</span>
            <i />
            <strong>Fixed the thing</strong>
          </div>
        </article>

        <article className="feature-card navy-card">
          <span className="feature-number">03</span>
          <div>
            <h3>Return without rebuilding context.</h3>
            <p>Folders, notes, and activity history keep the useful details close.</p>
          </div>
          <div className="folder-stack" aria-hidden="true">
            <span>general</span>
            <span>studio</span>
            <span>later</span>
          </div>
        </article>
      </section>

      <section className="how" id="how">
        <div className="how-heading">
          <p className="section-kicker">A gentler loop</p>
          <h2>Capture. Work. Remember.</h2>
        </div>
        <ol className="steps">
          <li>
            <span>1</span>
            <div>
              <h3>Put it down quickly.</h3>
              <p>Post a planned task or something you already did from one composer.</p>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <h3>Let the day change.</h3>
              <p>Move between folders, add notes, or work from the timeline.</p>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <h3>Keep the honest record.</h3>
              <p>Finish with evidence of progress, not a list designed to shame you.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="closing">
        <div className="closing-mark" aria-hidden="true">
          <Image src="/leslie-mark.png" alt="" width={108} height={72} />
        </div>
        <div>
          <p className="section-kicker">Leslie for macOS</p>
          <h2>Your day was real. Keep the record.</h2>
        </div>
        <a className="primary-button light-button" href={downloadUrl}>
          Get the beta <Arrow />
        </a>
      </section>

      <footer>
        <a className="brand footer-brand" href="#top">
          <Image src="/leslie-mark.png" alt="" width={42} height={28} />
          <span>Leslie</span>
        </a>
        <p>A quiet tool for nonlinear days.</p>
        <a href="https://github.com/thoriqakbar0/leslie">
          GitHub <Arrow />
        </a>
      </footer>
    </main>
  );
}
