import React from 'react'
import Image from 'next/image'
import styles from './booting_screen.module.css'

function BootingScreen({ visible, isShutDown, turnOn }) {
    const isVisible = visible || isShutDown

    return (
        <div
            style={{
                ...(isVisible ? { zIndex: '100' } : { zIndex: '-20' }),
                contentVisibility: 'auto',
            }}
            className={`${styles.screen} ${isVisible ? styles.screenVisible : styles.screenHidden}`}
        >
            <div className={styles.logoCluster}>
                <div className={styles.logoWrapper}>
                    <span className={styles.logoGlow} aria-hidden="true" />
                    <Image
                        width={512}
                        height={160}
                        className={styles.logo}
                        src="/images/kali-wordmark.svg"
                        alt="Kali Linux logo"
                        sizes="(max-width: 768px) 70vw, 30vw"
                        priority
                    />
                </div>
                <p className={styles.tagline}>Initializing the Kali Linux desktop environment</p>
            </div>

            <div className={styles.progressArea}>
                {isShutDown ? (
                    <button type="button" className={styles.powerButton} onClick={turnOn}>
                        <Image
                            width={40}
                            height={40}
                            className={styles.powerIcon}
                            src="/themes/Yaru/status/power-button.svg"
                            alt="Power Button"
                            sizes="40px"
                            priority
                        />
                        <span className={styles.powerLabel}>Power On</span>
                    </button>
                ) : (
                    <div className={styles.spinner} role="status" aria-live="polite">
                        <span className={styles.visuallyHidden}>Booting Kali Linux</span>
                    </div>
                )}
            </div>

            <div className={styles.links}>
                <a href="https://www.linkedin.com/in/unnippillil/" rel="noopener noreferrer" target="_blank">
                    LinkedIn
                </a>
                <span className={styles.linksDivider} aria-hidden="true">
                    |
                </span>
                <a href="https://github.com/Alex-Unnippillil" rel="noopener noreferrer" target="_blank">
                    GitHub
                </a>
            </div>
        </div>
    )
}

export default BootingScreen
