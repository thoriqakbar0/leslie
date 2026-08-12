const downloadUrl =
  "https://github.com/thoriqakbar0/leslie/releases/download/v0.2.1/Leslie-v0.2.1-macOS.zip";

const Arrow = () => <span aria-hidden="true">↗</span>;

export function App() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <nav className="site-nav" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="Leslie home">
          <img src="/leslie-mark.png" alt="" width={48} height={32} />
          <span>Leslie</span>
        </a>
        <div className="nav-links">
          <a href="#why">Why Leslie</a>
          <a href="#how">How it works</a>
          <a href="#source">Open source</a>
          <a className="nav-download" href={downloadUrl}>
            Download beta <Arrow />
          </a>
        </div>
      </nav>

      <main id="main-content">
        <section className="hero" id="top">
          <div className="hero-copy">
            <h1>The to-do list you’ll actually keep.</h1>
            <p className="hero-lede">
              Plans change. Leslie keeps what you did visible, so you can return to today without
              rebuilding the list.
            </p>
            <div className="hero-actions">
              <a className="primary-button" href={downloadUrl}>
                Download the macOS beta <Arrow />
              </a>
              <a className="text-link" href="#how">
                See how it works <span aria-hidden="true">↓</span>
              </a>
            </div>
            <p className="privacy-line">
              MIT licensed · No account · Your data stays local · Not notarized
            </p>
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
            <span>Plans and work logs</span>
            <span>on one screen</span>
          </div>
          <div className="screenshot-shell">
            <img
              src="/leslie-app.png"
              alt="Leslie showing two planned tasks and a factual timeline entry"
              width={2200}
              height={1520}
            />
          </div>
        </section>

        <section className="manifesto" id="why">
          <div className="manifesto-grid">
            <h2>Your plan is a direction. Your work log is the record.</h2>
            <div className="manifesto-copy">
              <p>
                A task list records what you planned. Leslie keeps that plan beside a factual log,
                including useful work that arrived unplanned.
              </p>
              <p>
                Progress appears as timeline entries. Leslie leaves out streaks, scores, and red
                overdue counts.
              </p>
            </div>
          </div>
        </section>

        <section className="features" aria-label="Leslie features">
          <article className="feature-card coral-card">
            <span className="feature-number">01</span>
            <div>
              <h3>Plan what comes next.</h3>
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
              <h3>Log work as it happens.</h3>
              <p>Record completed, partial, and unplanned work directly in the timeline.</p>
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
              <h3>Pick up where you left off.</h3>
              <p>Folders, notes, and activity history keep the useful details close.</p>
            </div>
            <div className="folder-stack" aria-hidden="true">
              <span>general</span>
              <span>studio</span>
              <span>later</span>
            </div>
          </article>
        </section>

        <section className="manifesto open-source" id="source">
          <div className="manifesto-grid">
            <h2>Open source means you can change Leslie.</h2>
            <div className="manifesto-copy">
              <p>
                Leslie’s application code is public under MIT. Inspect how it stores your work,
                change its behavior, or maintain your own version.
              </p>
              <a className="text-link" href="https://github.com/thoriqakbar0/leslie">
                View Leslie’s source <Arrow />
              </a>
            </div>
          </div>
        </section>

        <section className="how" id="how">
          <div className="how-heading">
            <h2>One composer, two kinds of record.</h2>
          </div>
          <ol className="steps">
            <li>
              <span>1</span>
              <div>
                <h3>Add a plan or a work log.</h3>
                <p>Use the same composer for something you intend to do or something you did.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <h3>Work from the day in front of you.</h3>
                <p>Move between folders, add notes, or record progress from the timeline.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <h3>Come back to what happened.</h3>
                <p>The timeline keeps completed, partial, and unplanned work visible.</p>
              </div>
            </li>
          </ol>
        </section>

        <section className="closing">
          <div className="closing-mark" aria-hidden="true">
            <img src="/leslie-mark.png" alt="" width={108} height={72} />
          </div>
          <div>
            <h2>Your day was real. Keep the record.</h2>
          </div>
          <a className="primary-button light-button" href={downloadUrl}>
            Download beta <Arrow />
          </a>
        </section>
      </main>

      <footer>
        <a className="brand footer-brand" href="#top">
          <img src="/leslie-mark.png" alt="" width={42} height={28} />
          <span>Leslie</span>
        </a>
        <p>Plans and work logs, side by side.</p>
        <a href="https://github.com/thoriqakbar0/leslie">
          View the source <Arrow />
        </a>
      </footer>
    </>
  );
}
