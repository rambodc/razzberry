// src/account/Account.js
import React from 'react';
import layoutStyles from '../styles/layout.module.css';
import styles from './Account.module.css';
import { useNavigate } from 'react-router-dom';
import { FaChevronRight, FaEnvelope, FaKey } from 'react-icons/fa';

function Item({ icon: Icon, label, onClick, color = '#111827' }) {
  return (
    <div className={styles.item}>
      <button onClick={onClick} className={styles.button}>
        <span className={styles.buttonLabel}>
          {Icon ? <Icon size={20} color={color} /> : null}
          <span className={styles.buttonText}>{label}</span>
        </span>
        <span className={styles.chevron} aria-hidden>
          <FaChevronRight />
        </span>
      </button>
    </div>
  );
}

export default function Account() {
  const navigate = useNavigate();
  const handleBack = () => {
    if (window.history.length > 2) navigate(-1); else navigate('/more');
  };

  return (
    <div className={layoutStyles.detailPage}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={handleBack} aria-label="Back">
          ← Back
        </button>
      </div>

      <div className={styles.pageShell}>
        <div className={styles.pageInner}>
          <h1 style={{ margin: '0 0 20px', textAlign: 'center' }}>Account</h1>
          <div className={styles.list}>
            <Item icon={FaEnvelope} color="#22c55e" label="Change Email" onClick={() => navigate('/account/email')} />
            <Item icon={FaKey} color="#f59e0b" label="Change Password" onClick={() => navigate('/account/password')} />
          </div>
        </div>
      </div>
    </div>
  );
}
