export const COUNTRY_OPTIONS = [
  { code: "EG", name: "مصر", dialCode: "+20" },
  { code: "SA", name: "السعودية", dialCode: "+966" },
  { code: "AE", name: "الإمارات", dialCode: "+971" },
  { code: "JO", name: "الأردن", dialCode: "+962" },
  { code: "KW", name: "الكويت", dialCode: "+965" },
  { code: "GB", name: "المملكة المتحدة", dialCode: "+44" },
] as const;

export type CountryCode = (typeof COUNTRY_OPTIONS)[number]["code"];

export interface ToponeIdentity {
  id: string;
  username: string;
  displayName: string;
  countryCode: CountryCode;
  online: boolean;
  portrait: number;
  isFavorite?: boolean;
}

export const normalizeUsername = (value: string): string =>
  value
    .normalize("NFKC")
    .trim()
    .replace(/^ID\.[A-Z]{2}\./i, "")
    .replace(/[^A-Z0-9_.-]/gi, "")
    .toUpperCase()
    .slice(0, 20);

export const makeToponeId = (countryCode: CountryCode, username: string): string =>
  `ID.${countryCode}.${normalizeUsername(username)}`;

export const isAvailableCountryUsername = (
  countryCode: CountryCode,
  username: string,
  identities: Pick<ToponeIdentity, "countryCode" | "username">[],
  ignoreId?: string,
) => {
  const normalized = normalizeUsername(username);
  if (!/^[A-Z0-9][A-Z0-9_.-]{1,19}$/.test(normalized)) return false;
  return !identities.some(
    (identity) =>
      identity.countryCode === countryCode &&
      normalizeUsername(identity.username) === normalized &&
      (ignoreId ? makeToponeId(identity.countryCode, identity.username) !== ignoreId : true),
  );
};

export const INITIAL_IDENTITIES: ToponeIdentity[] = [
  { id: "ID.EG.LAYLA", username: "LAYLA", displayName: "ليلى منصور", countryCode: "EG", online: true, portrait: 0, isFavorite: true },
  { id: "ID.EG.OMAR", username: "OMAR", displayName: "عمر خالد", countryCode: "EG", online: true, portrait: 1, isFavorite: true },
  { id: "ID.SA.OMAR", username: "OMAR", displayName: "عمر السالم", countryCode: "SA", online: false, portrait: 3 },
  { id: "ID.GB.NOUR", username: "NOUR", displayName: "نور أحمد", countryCode: "GB", online: true, portrait: 4 },
  { id: "ID.AE.MAYA", username: "MAYA", displayName: "مايا ناصر", countryCode: "AE", online: false, portrait: 2 },
  { id: "ID.JO.RAMI", username: "RAMI", displayName: "رامي حداد", countryCode: "JO", online: true, portrait: 5 },
];