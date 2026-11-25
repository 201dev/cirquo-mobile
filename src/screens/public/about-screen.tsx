import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowRight } from 'lucide-react-native';
import { AppButton, ScreenScrollView } from '@/components/ui/primitives';
import { MASCOT_LEDGER_IMAGE } from '@/lib/rescue-item-images';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radius } from '@/theme/tokens';

const FLOW = [
  {
    title: 'Mitra Usaha mendaftarkan Rescue Item',
    body: 'Surplus yang masih layak konsumsi dipasang dengan window pickup dan harga yang menurun.',
  },
  {
    title: 'Konsumen reservasi, lalu ambil sendiri',
    body: 'Bayar di aplikasi, tunjukkan kode pickup enam digit di lokasi. Tidak ada pengantaran.',
  },
  {
    title: 'Sisanya masuk Circular Routing',
    body: 'Yang tidak terambil dialihkan ke Mitra Pengolah terdekat, bukan hilang tanpa catatan.',
  },
  {
    title: 'Mitra Pengolah mencatat hasil akhirnya',
    body: 'Intake dan outcome dicatat, jadi perjalanan tiap kilogram berhenti pada angka.',
  },
] as const;

const OUTCOMES = [
  { label: 'Rescued', body: 'Diambil konsumen dan dikonsumsi manusia.' },
  { label: 'Recovered', body: 'Terlambat untuk dikonsumsi, tapi masih bisa diolah.' },
  { label: 'Residual', body: 'Tidak bisa diselamatkan maupun diolah. Tetap dicatat.' },
] as const;

const GLOSSARY = [
  { term: 'Rescue Item', body: 'Satu batch surplus dengan berat, harga, dan window pickup sendiri.' },
  { term: 'Mitra Usaha', body: 'Restoran, bakery, katering, atau toko yang menjadi titik pickup.' },
  { term: 'Mitra Pengolah', body: 'Pengolah organik yang menerima material saat jalur konsumsi tertutup.' },
  { term: 'Material Flow Ledger', body: 'Catatan append-only tiap perpindahan material.' },
] as const;

export default function AboutScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <ScreenScrollView>
      <Text style={styles.h1}>Tentang Kami</Text>
      <Text style={styles.lead}>
        Cirquo mengarahkan surplus pangan ke penggunaan terbaik berikutnya, dan
        mencatat setiap perpindahannya.
      </Text>

      <View style={styles.section}>
        <Text style={styles.h2}>Bukan aplikasi pengantaran</Text>
        <Text style={styles.body}>
          Tidak ada kurir. Konsumen mengambil sendiri di lokasi Mitra Usaha.
          Yang kami bangun adalah orkestrasi aliran material, dengan marketplace
          sebagai pintu masuknya.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.h2}>Bagaimana loopnya ditutup</Text>
        <Text style={styles.body}>
          Empat langkah, dari surplus yang baru didaftarkan sampai hasil
          akhirnya tercatat.
        </Text>
        <View style={styles.list}>
          {FLOW.map(({ title, body }, index) => (
            <View key={title} style={styles.flowRow}>
              <Text style={styles.flowNum}>{index + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{title}</Text>
                <Text style={styles.itemBody}>{body}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.h2}>Tiga kemungkinan akhir</Text>
        <Text style={styles.body}>
          Setiap Rescue Item berhenti di salah satu status ini. Kami menampilkan
          ketiganya, termasuk yang gagal.
        </Text>
        <View style={styles.list}>
          {OUTCOMES.map(({ label, body }) => (
            <View key={label} style={styles.defRow}>
              <Text style={styles.itemTitle}>{label}</Text>
              <Text style={styles.itemBody}>{body}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.h2}>Kenapa angkanya bisa dipercaya</Text>
        <Image
          source={MASCOT_LEDGER_IMAGE}
          style={styles.mascot}
          resizeMode="contain"
        />
        <Text style={styles.body}>
          Semua angka dampak dihitung dari Material Flow Ledger, dan tidak dari
          sumber lain. Ledger bersifat append-only, jadi koreksi ditulis sebagai
          entri baru tanpa mengubah riwayat.
        </Text>
        <Text style={[styles.body, { marginTop: 10 }]}>
          Estimated CO2e memakai faktor emisi rata-rata per jenis material.
          Angkanya perkiraan yang bisa ditelusuri, bukan hasil pengukuran
          langsung, dan bukan klaim offset.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.h2}>Istilah yang kami pakai</Text>
        <View style={styles.list}>
          {GLOSSARY.map(({ term, body }) => (
            <View key={term} style={styles.defRow}>
              <Text style={styles.itemTitle}>{term}</Text>
              <Text style={styles.itemBody}>{body}</Text>
            </View>
          ))}
        </View>
      </View>

      <AppButton
        size="lg"
        title="Jelajahi Rescue Item"
        rightIcon={<ArrowRight size={18} color={colors.white} />}
        onPress={() =>
          navigation.navigate('ConsumerMain', { screen: 'Explore' })
        }
        style={{ marginTop: 28 }}
      />
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  h1: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  lead: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: colors.mutedForeground,
  },
  section: {
    marginTop: 26,
  },
  h2: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.foreground,
  },
  body: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: colors.mutedForeground,
  },
  list: {
    marginTop: 14,
    gap: 14,
  },
  flowRow: {
    flexDirection: 'row',
    gap: 12,
  },
  flowNum: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.leaf500,
    width: 22,
  },
  defRow: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.foreground,
  },
  itemBody: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedForeground,
  },
  mascot: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginVertical: 14,
  },
});
