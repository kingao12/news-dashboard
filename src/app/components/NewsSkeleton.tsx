import styles from './NewsSkeleton.module.css';

export default function NewsSkeleton({ isListMode = false }: { isListMode?: boolean }) {
  if (isListMode) {
    return (
      <div className={styles.skeletonList}>
        <div className={styles.skeletonMetaList} />
        <div className={styles.skeletonTitleList} />
      </div>
    );
  }

  return (
    <div className={styles.skeletonCard}>
      <div className={styles.skeletonImage} />
      <div className={styles.skeletonContent}>
        <div className={styles.skeletonHeader}>
          <div className={styles.skeletonBadge} />
          <div className={styles.skeletonTime} />
        </div>
        <div className={styles.skeletonTitle} />
        <div className={styles.skeletonSnippet} />
        <div className={styles.skeletonFooter} />
      </div>
    </div>
  );
}
