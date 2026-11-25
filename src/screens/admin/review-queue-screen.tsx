import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery } from 'convex/react';
import { Check, FileWarning, ShieldCheck, X } from 'lucide-react-native';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import {
  PageHeader,
  QueryErrorBoundary,
} from '@/components/common/common-chrome';
import { StatusBadge } from '@/components/common/status-badge';
import {
  AppButton,
  AppCard,
  AppInput,
  AppLabel,
  AppSkeleton,
  BottomSheetModal,
  ScreenScrollView,
  SegmentedTabs,
} from '@/components/ui/primitives';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import {
  REVIEW_REASON_MAX,
  REVIEW_REASON_MIN,
  VERIFICATION_NOTE_MAX,
  formatWaitingTime,
  partnerTypeLabel,
  reviewReasonError,
  verificationNoteError,
} from '@/lib/admin-review';
import { getErrorMessage } from '@/lib/errors';
import { formatWeight, formatWibDateTime } from '@/lib/format';
import { colors, radius } from '@/theme/tokens';

type Partner = {
  kind: 'merchant' | 'processor';
  entityId: Id<'merchants'> | Id<'processors'>;
  ownerId: Id<'users'>;
  ownerName: string;
  ownerEmail: string;
  name: string;
  city: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  verificationStatus: string;
  businessType: string | null;
  facilityType: string | null;
  acceptedMaterialTypes: string[];
  dailyCapacityGrams: number | null;
  maxPickupRadiusMeters: number | null;
  outputTypes: string[];
  operatingHoursStart: number | null;
  operatingHoursEnd: number | null;
  profileComplete: boolean;
  rejectionReason: string | null;
  verificationNote: string | null;
  createdAt: number;
};

type DecisionMode = 'approve' | 'reject' | 'suspend' | 'reinstate';

const DECISION_COPY: Record<
  DecisionMode,
  {
    title: string;
    description: string;
    label: string;
    confirm: string;
    destructive: boolean;
  }
> = {
  approve: {
    title: 'Setujui verifikasi',
    description:
      'Akun langsung dapat beroperasi. Catatan bersifat opsional dan tersimpan pada audit Admin.',
    label: 'Catatan verifikasi (opsional)',
    confirm: 'Setujui',
    destructive: false,
  },
  reject: {
    title: 'Tolak verifikasi',
    description:
      'Alasan tersimpan pada audit Admin dan ditampilkan kepada pemilik akun agar dapat diperbaiki.',
    label: 'Alasan penolakan',
    confirm: 'Tolak permohonan',
    destructive: true,
  },
  suspend: {
    title: 'Tangguhkan akun',
    description:
      'Semua sesi pemilik akun dicabut sehingga ia keluar dari semua perangkat, dan listing/batch yang belum selesai dihentikan. Riwayat material tidak berubah.',
    label: 'Alasan penangguhan',
    confirm: 'Tangguhkan',
    destructive: true,
  },
  reinstate: {
    title: 'Aktifkan kembali akun',
    description:
      'Akun kembali menunggu verifikasi dan perlu diputuskan ulang. Alasan tersimpan pada audit Admin.',
    label: 'Alasan pengaktifan',
    confirm: 'Aktifkan kembali',
    destructive: false,
  },
};

function PartnerRowCard({
  partner,
  pendingReview,
  busy,
  now,
  onDecide,
}: {
  partner: Partner;
  pendingReview: boolean;
  busy: boolean;
  now: number;
  onDecide: (mode: DecisionMode) => void;
}) {
  const suspended = partner.verificationStatus === 'suspended';

  return (
    <AppCard style={{ gap: 8 }}>
      <View style={styles.cardTop}>
        <View style={styles.iconBox}>
          <ShieldCheck size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.partnerName}>{partner.name}</Text>
            <StatusBadge status={partner.verificationStatus} />
          </View>
          <Text style={styles.subText}>
            {partnerTypeLabel(partner)} · {partner.ownerName} · {partner.ownerEmail}
          </Text>
        </View>
      </View>

      <Text style={styles.tiny}>
        {partner.address ?? partner.city ?? 'Alamat belum tersedia'}
        {partner.latitude !== null && partner.longitude !== null
          ? ` · ${partner.latitude.toFixed(4)}, ${partner.longitude.toFixed(4)}`
          : ' · Koordinat belum tersedia'}
        {partner.dailyCapacityGrams
          ? ` · Kapasitas ${formatWeight(partner.dailyCapacityGrams)}/hari`
          : ''}
      </Text>

      {partner.kind === 'processor' ? (
        <Text style={styles.tiny}>
          Material: {partner.acceptedMaterialTypes.join(', ') || 'belum diisi'} ·
          Output: {partner.outputTypes.join(', ') || 'belum diisi'}
        </Text>
      ) : null}

      <Text
        style={[
          styles.tiny,
          !partner.profileComplete && { color: colors.destructive },
        ]}
      >
        {partner.profileComplete
          ? 'Profil lengkap untuk ditinjau.'
          : 'Profil belum lengkap; verifikasi akan ditolak sampai data diperbarui.'}
      </Text>

      {partner.rejectionReason ? (
        <Text style={[styles.tiny, { color: colors.destructive }]}>
          Alasan penolakan: {partner.rejectionReason}
        </Text>
      ) : null}

      <Text style={styles.tiny}>
        Mendaftar {formatWibDateTime(partner.createdAt)} ·{' '}
        {pendingReview ? 'menunggu' : 'terdaftar'}{' '}
        {formatWaitingTime(partner.createdAt, now)}
      </Text>

      <View style={styles.actionRow}>
        {pendingReview ? (
          <>
            <AppButton
              variant="outline"
              size="sm"
              disabled={busy}
              title="Tolak"
              leftIcon={<X size={15} color={colors.foreground} />}
              onPress={() => onDecide('reject')}
              style={{ flex: 1 }}
            />
            <AppButton
              size="sm"
              disabled={busy}
              title="Setujui"
              leftIcon={<Check size={15} color={colors.white} />}
              onPress={() => onDecide('approve')}
              style={{ flex: 1 }}
            />
          </>
        ) : (
          <AppButton
            variant="outline"
            size="sm"
            disabled={busy}
            title={suspended ? 'Aktifkan kembali' : 'Tangguhkan'}
            onPress={() => onDecide(suspended ? 'reinstate' : 'suspend')}
            style={{ flex: 1 }}
          />
        )}
      </View>
    </AppCard>
  );
}

function VerificationQueueBody({ sessionToken }: { sessionToken: string }) {
  const toast = useToast();
  const merchantPending = useQuery(api.admin.listPendingVerifications, {
    sessionToken,
    kind: 'merchant',
  });
  const processorPending = useQuery(api.admin.listPendingVerifications, {
    sessionToken,
    kind: 'processor',
  });
  const accounts = useQuery(api.admin.listUsers, { sessionToken });

  const verifyMerchant = useMutation(api.admin.verifyMerchant);
  const verifyProcessor = useMutation(api.admin.verifyProcessor);
  const rejectAccount = useMutation(api.admin.rejectAccount);
  const suspendUser = useMutation(api.admin.suspendUser);

  const [tab, setTab] = useState<'pending' | 'accounts'>('pending');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [decision, setDecision] = useState<{
    partner: Partner;
    mode: DecisionMode;
  } | null>(null);
  const [reason, setReason] = useState('');

  if (
    merchantPending === undefined ||
    processorPending === undefined ||
    accounts === undefined
  ) {
    return (
      <View style={{ gap: 10 }}>
        {[0, 1, 2].map((i) => (
          <AppSkeleton key={i} height={130} borderRadius={radius.lg} />
        ))}
      </View>
    );
  }

  const now = Date.now();
  const copy = decision ? DECISION_COPY[decision.mode] : null;
  const optional = decision?.mode === 'approve';
  const limit = optional ? VERIFICATION_NOTE_MAX : REVIEW_REASON_MAX;
  const error = decision
    ? optional
      ? verificationNoteError(reason)
      : reviewReasonError(reason)
    : null;
  const showError = error !== null && reason.trim().length > 0;

  const openDialog = (partner: Partner, mode: DecisionMode) => {
    setDecision({ partner, mode });
    setReason('');
  };

  const closeDialog = () => {
    setDecision(null);
    setReason('');
  };

  const confirm = async () => {
    if (!decision || error !== null) return;
    const trimmed = reason.trim();
    const { partner, mode } = decision;
    setBusyId(String(partner.entityId));
    try {
      if (mode === 'approve') {
        const note = trimmed.length > 0 ? trimmed : undefined;
        if (partner.kind === 'merchant') {
          await verifyMerchant({
            sessionToken,
            merchantId: partner.entityId as Id<'merchants'>,
            note,
          });
        } else {
          await verifyProcessor({
            sessionToken,
            processorId: partner.entityId as Id<'processors'>,
            note,
          });
        }
        toast.success(`${partner.name} berhasil diverifikasi.`);
      } else if (mode === 'reject') {
        await rejectAccount({
          sessionToken,
          kind: partner.kind,
          entityId: partner.entityId,
          reason: trimmed,
        });
        toast.success('Permohonan ditolak dan alasan dikirim ke pemilik akun.');
      } else {
        const result = await suspendUser({
          sessionToken,
          userId: partner.ownerId,
          suspend: mode === 'suspend',
          reason: trimmed,
        });
        toast.success(
          mode === 'suspend'
            ? `Akun ditangguhkan · ${result.sessionsRevoked} sesi dicabut · ${result.affectedListings} listing & ${result.affectedBatches} batch terdampak.`
            : 'Akun diaktifkan kembali dan menunggu verifikasi ulang.',
        );
      }
      closeDialog();
    } catch (caught) {
      toast.error(getErrorMessage(caught, 'Keputusan tidak dapat disimpan.'));
    } finally {
      setBusyId(null);
    }
  };

  const pendingTotal = merchantPending.length + processorPending.length;

  return (
    <View style={{ gap: 14 }}>
      <SegmentedTabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'pending', label: `Menunggu (${pendingTotal})` },
          { value: 'accounts', label: `Akun Mitra (${accounts.length})` },
        ]}
      />

      {tab === 'pending' ? (
        <View style={{ gap: 16 }}>
          {(
            [
              ['Merchant', merchantPending],
              ['Organic Processor', processorPending],
            ] as readonly [string, Partner[]][]
          ).map(([label, list]) => (
            <View key={label} style={{ gap: 10 }}>
              <Text style={styles.sectionLabel}>
                {label} ({list.length})
              </Text>
              {list.length > 0 ? (
                list.map((partner) => (
                  <PartnerRowCard
                    key={`${partner.kind}-${partner.entityId}`}
                    partner={partner}
                    pendingReview
                    busy={busyId === String(partner.entityId)}
                    now={now}
                    onDecide={(mode) => openDialog(partner, mode)}
                  />
                ))
              ) : (
                <View style={styles.emptyBox}>
                  <Text style={styles.tiny}>
                    Tidak ada permohonan {label.toLowerCase()} yang menunggu.
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {accounts.length > 0 ? (
            accounts.map((partner) => (
              <PartnerRowCard
                key={`${partner.kind}-${partner.entityId}`}
                partner={partner}
                pendingReview={false}
                busy={busyId === String(partner.entityId)}
                now={now}
                onDecide={(mode) => openDialog(partner, mode)}
              />
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.tiny}>
                Belum ada akun mitra yang sudah diputuskan.
              </Text>
            </View>
          )}
        </View>
      )}

      <BottomSheetModal
        visible={decision !== null}
        onClose={closeDialog}
        title={copy?.title}
        description={copy?.description}
      >
        <View style={{ gap: 12 }}>
          <View>
            <Text style={styles.partnerName}>{decision?.partner.name}</Text>
            <Text style={styles.tiny}>
              {decision?.partner.ownerName} · {decision?.partner.ownerEmail}
            </Text>
          </View>
          <View>
            <AppLabel>{copy?.label}</AppLabel>
            <AppInput
              multiline
              value={reason}
              onChangeText={setReason}
              maxLength={limit}
              hasError={showError}
            />
            <Text
              style={[
                styles.tiny,
                { marginTop: 6 },
                showError && { color: colors.destructive },
              ]}
            >
              {showError
                ? error
                : optional
                  ? `${reason.trim().length} dari ${limit} karakter, boleh dikosongkan.`
                  : `${reason.trim().length} dari ${limit} karakter, minimal ${REVIEW_REASON_MIN}.`}
            </Text>
          </View>
          <View style={styles.actionRow}>
            <AppButton
              variant="outline"
              title="Batal"
              onPress={closeDialog}
              style={{ flex: 1 }}
            />
            <AppButton
              variant={copy?.destructive ? 'destructive' : 'default'}
              loading={busyId !== null}
              disabled={busyId !== null || error !== null}
              title={busyId !== null ? 'Memproses...' : (copy?.confirm ?? '')}
              onPress={() => void confirm()}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </BottomSheetModal>
    </View>
  );
}

function ModerationQueueBody({ sessionToken }: { sessionToken: string }) {
  const toast = useToast();
  const items = useQuery(api.admin.listModeratableListings, { sessionToken });
  const moderate = useMutation(api.admin.moderateListing);

  const [selected, setSelected] = useState<
    NonNullable<typeof items>[number] | null
  >(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  if (items === undefined) {
    return (
      <View style={{ gap: 10 }}>
        {[0, 1, 2].map((i) => (
          <AppSkeleton key={i} height={110} borderRadius={radius.lg} />
        ))}
      </View>
    );
  }

  const error = reviewReasonError(reason);
  const showError = error !== null && reason.trim().length > 0;

  const submit = async () => {
    if (!selected || error !== null) return;
    setBusy(true);
    try {
      const result = await moderate({
        sessionToken,
        surplusItemId: selected.surplusItemId,
        reason: reason.trim(),
      });
      toast.success(
        `${formatWeight(result.moderatedWeightGrams)} material dimoderasi · ${result.ordersRefunded} order refund · ${result.batchesCancelled} batch dibatalkan.`,
      );
      setSelected(null);
      setReason('');
    } catch (caught) {
      toast.error(getErrorMessage(caught, 'Moderasi gagal.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 10 }}>
      {items.length > 0 ? (
        items.map((item) => (
          <AppCard key={item.surplusItemId} style={{ gap: 10 }}>
            <View style={styles.cardTop}>
              <View style={styles.iconBox}>
                <FileWarning size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.partnerName}>{item.name}</Text>
                  <StatusBadge status={item.status} />
                </View>
                <Text style={styles.subText}>
                  {item.merchantName} · {item.remainingQuantity} porsi ·{' '}
                  {formatWeight(item.weightPerItemGrams)}/porsi
                </Text>
                <Text style={styles.tiny}>
                  Pickup selesai {formatWibDateTime(item.pickupEndAt)}
                </Text>
              </View>
            </View>
            <AppButton
              variant="outline"
              size="sm"
              title="Moderasi"
              leftIcon={<FileWarning size={15} color={colors.foreground} />}
              onPress={() => {
                setSelected(item);
                setReason('');
              }}
            />
          </AppCard>
        ))
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.tiny}>
            Tidak ada Rescue Item aktif yang dapat dimoderasi.
          </Text>
        </View>
      )}

      <BottomSheetModal
        visible={selected !== null}
        onClose={() => {
          setSelected(null);
          setReason('');
        }}
        title={`Moderasi ${selected?.name ?? ''}`}
        description="Tindakan ini terminal. Material unresolved menjadi Residual, order belum terpenuhi masuk jalur refund, dan event ledger tidak dapat diedit."
      >
        <View style={{ gap: 12 }}>
          <View>
            <AppLabel required>Alasan untuk Merchant</AppLabel>
            <AppInput
              multiline
              value={reason}
              onChangeText={setReason}
              maxLength={REVIEW_REASON_MAX}
              hasError={showError}
            />
            <Text
              style={[
                styles.tiny,
                { marginTop: 6 },
                showError && { color: colors.destructive },
              ]}
            >
              {showError
                ? error
                : `${reason.trim().length} dari ${REVIEW_REASON_MAX} karakter, minimal ${REVIEW_REASON_MIN}.`}
            </Text>
          </View>
          <View style={styles.actionRow}>
            <AppButton
              variant="outline"
              title="Batal"
              onPress={() => {
                setSelected(null);
                setReason('');
              }}
              style={{ flex: 1 }}
            />
            <AppButton
              variant="destructive"
              loading={busy}
              disabled={busy || error !== null}
              title={busy ? 'Memproses...' : 'Konfirmasi moderasi'}
              onPress={() => void submit()}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </BottomSheetModal>
    </View>
  );
}

export function AdminVerificationsScreen() {
  const { sessionToken } = useAuth();
  return (
    <ScreenScrollView>
      <PageHeader
        title="Verifikasi mitra"
        description="Setujui, tolak, tangguhkan, dan aktifkan kembali Merchant atau Organic Processor."
      />
      <QueryErrorBoundary title="Antrean verifikasi tidak dapat dimuat">
        {sessionToken ? (
          <VerificationQueueBody sessionToken={sessionToken} />
        ) : null}
      </QueryErrorBoundary>
    </ScreenScrollView>
  );
}

export function AdminModerationScreen() {
  const { sessionToken } = useAuth();
  return (
    <ScreenScrollView>
      <PageHeader
        title="Moderasi Rescue Item"
        description="Tutup Rescue Item bermasalah secara terminal dengan alasan yang dapat dilihat Merchant."
      />
      <QueryErrorBoundary title="Antrean moderasi tidak dapat dimuat">
        {sessionToken ? (
          <ModerationQueueBody sessionToken={sessionToken} />
        ) : null}
      </QueryErrorBoundary>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
  cardTop: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  partnerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  subText: {
    marginTop: 3,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  tiny: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.mutedForeground,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  emptyBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
  },
});
