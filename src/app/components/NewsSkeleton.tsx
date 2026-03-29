import styles from './NewsSkeleton.module.css';

export default function NewsSkeleton() {
  return (
    <div className={styles.skeletonCard}>
      <div className={styles.skeletonImage} />
      <div className={styles.skeletonContent}>
        <div className={styles.skeletonHeader}>
          <div className={styles.skeletonBadge} />
          <div className={styles.skeletonTime} />
        </div>
        <div className={styles.skeletonTitle} />
        <div className={styles.skeletonTitleShort} />
        <div className={styles.skeletonSnippet} />
        <div className={styles.skeletonFooter} />
      </div>
    </div>
  );
}
