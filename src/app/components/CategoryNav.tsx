'use client';

import { LucideIcon } from 'lucide-react';
import styles from './CategoryNav.module.css';

interface Category {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface CategoryNavProps {
  categories: Category[];
  activeCategory: string;
  onSelect: (id: string) => void;
}

export default function CategoryNav({ categories, activeCategory, onSelect }: CategoryNavProps) {
  return (
    <nav className={styles.navContainer}>
      <ul className={styles.navList}>
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          const Icon = cat.icon;
          return (
            <li key={cat.id}>
              <button
                onClick={() => onSelect(cat.id)}
                className={`${styles.navButton} ${isActive ? styles.active : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={18} className={styles.icon} />
                <span className={styles.label}>{cat.label}</span>
                {isActive && <div className={styles.activeIndicator} />}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
