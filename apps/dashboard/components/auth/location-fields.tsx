"use client";

import { City, Country, State } from "country-state-city";
import { useMemo } from "react";
import { useI18n } from "@muakhah/i18n";
import { IconSelect } from "@/components/forms/icon-field";
import styles from "../../app/auth.module.css";

type LocationFieldsProps = {
  country: string;
  state: string;
  city: string;
  onCountryChange: (value: string) => void;
  onStateChange: (value: string) => void;
  onCityChange: (value: string) => void;
};

export function LocationFields({
  country: countryName,
  state: stateName,
  city: cityName,
  onCountryChange,
  onStateChange,
  onCityChange,
}: LocationFieldsProps) {
  const { t } = useI18n();
  const countries = useMemo(
    () => Country.getAllCountries().sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  const countryCode =
    countries.find((country) => country.name === countryName)?.isoCode ?? "";

  const states = useMemo(
    () => (countryCode ? State.getStatesOfCountry(countryCode) : []),
    [countryCode],
  );

  const hasStates = states.length > 0;

  const stateCode =
    states.find((state) => state.name === stateName)?.isoCode ?? "";

  const cities = useMemo(() => {
    if (!countryCode) return [];
    if (hasStates) {
      if (!stateCode) return [];
      return City.getCitiesOfState(countryCode, stateCode);
    }
    return City.getCitiesOfCountry(countryCode) ?? [];
  }, [countryCode, stateCode, hasStates]);

  const sortedStates = useMemo(
    () => [...states].sort((a, b) => a.name.localeCompare(b.name)),
    [states],
  );

  const sortedCities = useMemo(
    () => [...cities].sort((a, b) => a.name.localeCompare(b.name)),
    [cities],
  );

  return (
    <>
      <div className={styles["form-group"]}>
        <label htmlFor="country">{t("auth.register.country")}</label>
        <IconSelect
          icon="globe"
          id="country"
          name="country"
          value={countryName}
          onChange={(e) => {
            onCountryChange(e.target.value);
            onStateChange("");
            onCityChange("");
          }}
        >
          <option value="">{t("auth.register.selectCountry")}</option>
          {countries.map((country) => (
            <option key={country.isoCode} value={country.name}>
              {country.name}
            </option>
          ))}
        </IconSelect>
      </div>

      <div className={styles["form-group"]}>
        <label htmlFor="state">
          {t("auth.register.state")}{" "}
          <span className={styles.optional}>{t("auth.register.optional")}</span>
        </label>
        <IconSelect
          icon="map"
          id="state"
          name="state"
          disabled={!countryName || !hasStates}
          value={stateName}
          onChange={(e) => {
            onStateChange(e.target.value);
            onCityChange("");
          }}
        >
          <option value="">
            {!countryName
              ? t("auth.register.selectCountryFirst")
              : !hasStates
                ? t("auth.register.noStates")
                : t("auth.register.selectState")}
          </option>
          {sortedStates.map((state) => (
            <option key={state.isoCode} value={state.name}>
              {state.name}
            </option>
          ))}
        </IconSelect>
      </div>

      <div className={styles["form-group"]}>
        <label htmlFor="city">
          {t("auth.register.city")}{" "}
          <span className={styles.optional}>{t("auth.register.optional")}</span>
        </label>
        <IconSelect
          icon="building"
          id="city"
          name="city"
          disabled={
            !countryName || (hasStates && !stateName) || sortedCities.length === 0
          }
          value={cityName}
          onChange={(e) => onCityChange(e.target.value)}
        >
          <option value="">
            {!countryName
              ? t("auth.register.selectCountryFirst")
              : hasStates && !stateName
                ? t("auth.register.selectStateFirst")
                : sortedCities.length === 0
                  ? t("auth.register.noCities")
                  : t("auth.register.selectCity")}
          </option>
          {sortedCities.map((city) => (
            <option key={`${city.stateCode}-${city.name}`} value={city.name}>
              {city.name}
            </option>
          ))}
        </IconSelect>
      </div>
    </>
  );
}
