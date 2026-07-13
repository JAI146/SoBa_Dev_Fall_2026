"use client";

import { useState, type ReactNode } from "react";
import styles from "./family-card.module.css";

export type FamilyCardMediaItem = {
    kind: string;
    url?: string | null;
    blurredUrl?: string | null;
    locked?: boolean;
    isSensitive?: boolean;
};

export type FamilyCardAction = { href: string; label: string };

export type FamilyCardLabels = {
    generalRegion: string;
    familySize: string;
    children: string;
    caseCategory: string;
    priorityLevel: string;
    monthlyRequired: string;
    coveredAmount: string;
    remainingAmount: string;
    coverage: string;
    availableReceivingMethods: string;
    coverageStatus: string;
    lastUpdate: string;
    sensitiveContent: string;
    blurredHint: string;
    revealMedia: string;
};

export type FamilyCardProps = {
    publicCode: string;
    region: string;
    familySize: number;
    childrenCount: number;
    caseCategory: string;
    priorityLevel: string;
    monthlyRequired: string;
    monthlyCovered: string;
    monthlyRemaining: string;
    coveragePercent: number;
    coverageStatus: string;
    lastUpdate: string;
    receivingMethods: Array<{ id: string; label: string }>;
    mediaItems: FamilyCardMediaItem[];
    labels: FamilyCardLabels;
    viewDetailsAction: FamilyCardAction;
    primaryAction: FamilyCardAction;
    className?: string;
};

export function familyCoveragePercent(required: number, remaining: number) {
    if (required <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round(((required - remaining) / required) * 100)));
}

export function familyCoverageStatusKey(family: {
    monthlyCoveredAmount: number;
    monthlyRemainingAmount: number;
    coverageStatus: string;
}) {
    if (family.monthlyCoveredAmount <= 0 || family.coverageStatus === "not_covered") return "not_sponsored";
    if (family.coverageStatus === "fully_covered" || family.monthlyRemainingAmount <= 0) return "fully_covered_temporarily";
    if (family.coverageStatus === "expired") return "ending_soon";
    if (family.monthlyCoveredAmount > 0 && family.monthlyRemainingAmount > 0) return "needs_additional_sponsor";
    return "partially_sponsored";
}

type IconName =
    | "alert"
    | "baby"
    | "calendar"
    | "card"
    | "dollar"
    | "eye"
    | "eyeOff"
    | "folderHeart"
    | "handCoins"
    | "heartHandshake"
    | "mapPin"
    | "percent"
    | "piggyBank"
    | "users";
function Icon({ name, small = false }: { name: IconName; small?: boolean }) {
    const paths: Record<IconName, ReactNode> = {
        alert: <><path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
        baby: <><circle cx="12" cy="12" r="9" /><path d="M9 10h.01M15 10h.01M9.5 15a4 4 0 0 0 5 0M12 3c.8 1.5.4 3-1 4" /></>,
        calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
        card: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /></>,
        dollar: <><circle cx="12" cy="12" r="9" /><path d="M16 8.5c-.8-.8-2-1.2-3.5-1.2-2 0-3.5 1-3.5 2.5s1.4 2.1 3.5 2.5S16 13.2 16 14.8s-1.5 2.5-3.5 2.5c-1.6 0-2.9-.5-3.8-1.4M12.5 5v14" /></>,
        eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
        eyeOff: <><path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.5 10.5 0 0 1 12 4c5 0 9 4 10 8a12.8 12.8 0 0 1-2.2 4.3M6.6 6.6C4.4 8 2.8 10 2 12c1 4 5 8 10 8 1.5 0 2.9-.4 4.1-1" /></>,
        folderHeart: <><path d="M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /><path d="M12 17s-3-1.7-3-3.7a1.7 1.7 0 0 1 3-1.1 1.7 1.7 0 0 1 3 1.1c0 2-3 3.7-3 3.7Z" /></>,
        handCoins: <><path d="M3 16h3l4 3h5l6-5c-.8-1-2-1.2-3-.5l-3 2" /><path d="M6 16v-5h4c1.7 0 3 1.3 3 3h-3M17 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /></>,
        heartHandshake: <><path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z" /><path d="M12 5 9 8a2.2 2.2 0 0 0 0 3.1c.8.8 2.1.8 3 .1l2.1-1.9a2.8 2.8 0 0 1 3.8 0L20 12" /><path d="m18 15-2-2M15 18l-2-2" /></>,
        mapPin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
        percent: <><path d="m19 5-14 14" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></>,
        piggyBank: <><path d="M19 8a7 7 0 0 0-12.5-2L3 5v6l2 1c.4 2 1.7 3.7 3.5 4.6V20h3v-2h4v2h3v-3.5A6 6 0 0 0 21 12h1V9h-3Z" /><path d="M14 7h.01M9 6c1-1 3-1.5 5-1" /></>,
        users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
    };
    return <svg viewBox="0 0 24 24" aria-hidden className={`${styles.icon} ${small ? styles.smallIcon : ""}`}>{paths[name]}</svg>;
}

function FamilyMedia({ mediaItems, publicCode, labels }: Pick<FamilyCardProps, "mediaItems" | "publicCode" | "labels">) {
    const [revealed, setRevealed] = useState(false);
    const images = mediaItems.filter((item) => item.kind === "image");
    const image = images.find((item) => !item.isSensitive) ?? images[0];
    const locked = image?.locked ?? true;
    const displayUrl = locked || !revealed ? image?.blurredUrl ?? image?.url : image?.url;
    const canReveal = Boolean(image && !locked && image.url);

    return (
        <div className={styles.media}>
            {displayUrl ? <img src={displayUrl} alt="" className={`${styles.mediaImage} ${locked || !revealed ? styles.mediaImageBlurred : ""}`} /> : null}
            {image && (locked || !revealed) ? (
                <button type="button" disabled={!canReveal} onClick={() => setRevealed(true)} className={`${styles.mediaOverlay} ${canReveal ? styles.mediaOverlayRevealable : ""}`} aria-label={canReveal ? labels.revealMedia : labels.blurredHint}>
                    <span className={styles.mediaMessage}>
                        <span className={styles.mediaEye}><Icon name="eyeOff" /></span>
                        <span className={styles.mediaTitle}>{labels.sensitiveContent}</span>
                        <span className={styles.mediaHint}>{canReveal ? labels.revealMedia : labels.blurredHint}</span>
                    </span>
                </button>
            ) : null}
            <span className={styles.code}>#{publicCode}</span>
        </div>
    );
}

function StatTile({ icon, tone, label, value }: { icon: IconName; tone?: string; label: string; value: string | number }) {
    return <div className={styles.tile}><span className={`${styles.iconCircle} ${tone}`}><Icon name={icon} /></span><p className={styles.eyebrow}>{label}</p><p className={styles.tileValue}>{value}</p></div>;
}

function MoneyRow({ icon, tone, label, value, valueTone }: { icon: IconName; tone?: string; label: string; value: string; valueTone?: string }) {
    return <div className={styles.moneyRow}><span className={styles.moneyLabel}><span className={`${styles.iconCircle} ${tone}`}><Icon name={icon} small /></span><span className={styles.moneyLabelText}>{label}</span></span><span className={`${styles.moneyValue} ${valueTone}`}>{value}</span></div>;
}

export function FamilyCard(props: FamilyCardProps) {
    const coverage = Math.min(100, Math.max(0, Math.round(props.coveragePercent)));
    return (
        <article className={`${styles.card} ${props.className ?? ""}`}>
            <FamilyMedia mediaItems={props.mediaItems} publicCode={props.publicCode} labels={props.labels} />
            <div className={styles.body}>
                <div className={styles.region}><span className={`${styles.iconCircle} ${styles.regionIcon}`}><Icon name="mapPin" /></span><div><p className={styles.eyebrow}>{props.labels.generalRegion}</p><p className={styles.regionValue}>{props.region}</p></div></div>
                <div className={styles.tiles}>
                    <StatTile icon="users" tone={styles.skyIcon} label={props.labels.familySize} value={props.familySize} />
                    <StatTile icon="baby" tone={styles.emeraldIcon} label={props.labels.children} value={props.childrenCount} />
                    <StatTile icon="folderHeart" tone={styles.roseIcon} label={props.labels.caseCategory} value={props.caseCategory} />
                    <StatTile icon="alert" tone={styles.amberIcon} label={props.labels.priorityLevel} value={props.priorityLevel} />
                </div>
                <div className={styles.moneyPanel}>
                    <MoneyRow icon="dollar" tone={styles.emeraldIcon} label={props.labels.monthlyRequired} value={props.monthlyRequired} valueTone={styles.valueDefault} />
                    <MoneyRow icon="piggyBank" tone={styles.emeraldIcon} label={props.labels.coveredAmount} value={props.monthlyCovered} valueTone={styles.valueCovered} />
                    <MoneyRow icon="handCoins" tone={styles.orangeIcon} label={props.labels.remainingAmount} value={props.monthlyRemaining} valueTone={styles.valueRemaining} />
                    <MoneyRow icon="percent" tone={styles.tealIcon} label={props.labels.coverage} value={`${coverage}%`} valueTone={styles.valueCoverage} />
                    <div className={styles.progressTrack} role="progressbar" aria-label={props.labels.coverage} aria-valuemin={0} aria-valuemax={100} aria-valuenow={coverage}><div className={styles.progressFill} style={{ width: `${coverage}%` }} /></div>
                </div>
                <div className={styles.detailsPanel}>
                    <p className={`${styles.eyebrow} ${styles.sectionTitle}`}><span className={styles.sectionIcon}><Icon name="card" small /></span>{props.labels.availableReceivingMethods}</p>
                    <div className={styles.methodList}>{props.receivingMethods.map((method) => <span className={styles.method} key={method.id}><Icon name="card" small />{method.label}</span>)}</div>
                    <div className={styles.statusGrid}>
                        <div><p className={`${styles.eyebrow} ${styles.statusLabel}`}><span className={styles.sectionIcon}><Icon name="percent" small /></span>{props.labels.coverageStatus}</p><p className={styles.statusValue}>{props.coverageStatus}</p></div>
                        <div><p className={`${styles.eyebrow} ${styles.statusLabel}`}><span className={styles.sectionIcon}><Icon name="calendar" small /></span>{props.labels.lastUpdate}</p><p className={styles.statusValue}>{props.lastUpdate}</p></div>
                    </div>
                </div>
                <div className={styles.actions}>
                    <a href={props.viewDetailsAction.href} className={`${styles.action} ${styles.secondaryAction}`}>
                        <Icon name="eye" small />
                        {props.viewDetailsAction.label}
                    </a>
                    <a href={props.primaryAction.href} className={`${styles.action} ${styles.primaryAction}`}>
                        <Icon name="heartHandshake" small />
                        {props.primaryAction.label}
                    </a>
                </div>
            </div>
        </article>
    );
}