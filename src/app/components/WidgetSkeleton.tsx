import styles from './WidgetSkeleton.module.css';

export default function WidgetSkeleton() {
  return (
    <div className={styles.skeletonPanel}>
      <div className={styles.skeletonTabs}>
        <div className={styles.skeletonTab} />
        <div className={styles.skeletonTab} />
      </div>
      <div className={styles.skeletonChart}>
        <div className={styles.skeletonLine} />
        <div className={styles.skeletonLine} />
        <div className={styles.skeletonLine} />
      </div>
      <div className={styles.skeletonRanking}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className={styles.skeletonItem}>
            <div className={styles.skeletonCircle} />
            <div className={styles.skeletonText} />
            <div className={styles.skeletonPrice} />
          </div>
        ))}
      </div>
    </div>
  );
}
