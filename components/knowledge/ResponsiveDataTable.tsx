import styles from './ResponsiveDataTable.module.css';

type ResponsiveDataTableProps = {
  headers: string[];
  rows: string[][];
  ariaLabel: string;
  minWidth?: number;
  titleColumnIndex?: number;
};

export default function ResponsiveDataTable({
  headers,
  rows,
  ariaLabel,
  minWidth = 680,
  titleColumnIndex = 0,
}: ResponsiveDataTableProps) {
  const safeTitleIndex = Math.min(Math.max(titleColumnIndex, 0), Math.max(headers.length - 1, 0));
  const detailColumns = headers
    .map((header, index) => ({ header, index }))
    .filter(({ index }) => index !== safeTitleIndex);

  return (
    <div className={styles.shell}>
      <div className={styles.desktopTable}>
        <table className={styles.table} style={{ minWidth }} aria-label={ariaLabel}>
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header} scope="col">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${row[safeTitleIndex] ?? 'row'}-${rowIndex}`}>
                {headers.map((_, cellIndex) => (
                  <td key={`${cellIndex}-${row[cellIndex] ?? 'empty'}`}>
                    {row[cellIndex] || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.mobileCards} aria-label={`${ariaLabel}, mobile layout`}>
        {rows.map((row, rowIndex) => (
          <article className={styles.card} key={`${row[safeTitleIndex] ?? 'row'}-mobile-${rowIndex}`}>
            <div className={styles.titleLabel}>{headers[safeTitleIndex]}</div>
            <h3 className={styles.cardTitle}>{row[safeTitleIndex] || `Item ${rowIndex + 1}`}</h3>
            <dl className={styles.details}>
              {detailColumns.map(({ header, index }) => (
                <div className={styles.detailRow} key={`${header}-${index}`}>
                  <dt>{header}</dt>
                  <dd>{row[index] || '—'}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}
