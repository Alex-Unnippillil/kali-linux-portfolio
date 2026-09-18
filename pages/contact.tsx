import Meta from '../components/SEO/Meta';
import PortfolioFrame from '../components/portfolio/PortfolioFrame';
import styles from '../components/portfolio/portfolio.module.css';
export default function Contact() {
  return <><Meta title="Contact Alex Unnippillil" description="Contact Alex Unnippillil about projects, technical questions and collaboration." path="/contact" />
    <PortfolioFrame active="contact" title="Contact / direct channels"><div className={styles.prose}>
      <p className={styles.eyebrow}>Start a conversation</p><h1 className={styles.pageTitle}>Contact Alex</h1><p>For project questions, engineering conversations or collaboration, send an email. Include the project name and what you would like to discuss.</p>
      <div className={styles.actions}><a className={styles.primary} href="mailto:alex.unnippillil@hotmail.com">Email Alex</a><a className={styles.secondary} href="https://github.com/Alex-Unnippillil" target="_blank" rel="noopener noreferrer">GitHub profile (new tab)</a></div>
      <p>Email address: <a href="mailto:alex.unnippillil@hotmail.com">alex.unnippillil@hotmail.com</a></p>
      <p className={styles.notice}>Email opens your mail application. This page does not collect messages, require an account, or send form data to a third-party service.</p>
    </div></PortfolioFrame></>;
}
