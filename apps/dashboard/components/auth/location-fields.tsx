"use client";

import { City, Country, State } from "country-state-city";
import { useMemo } from "react";
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
      return stateCode ? City.getCitiesOfState(countryCode, stateCode) : [];
    }
    return City.getCitiesOfCountry(countryCode) ?? [];
  }, [countryCode, hasStates, stateCode]);

  return (
    <>
      <div className={styles["form-group"]}>
        <label htmlFor="country">
          Country <span className={styles.optional}>Optional</span>
        </label>
        <IconSelect
          icon="globe"
          id="country"
          name="country"
          value={countryName}
          onChange={(event) => {
            onCountryChange(event.target.value);
            onStateChange("");
            onCityChange("");
          }}
        >
          <option value="">Select a country</option>
          {countries.map((country) => (
            <option key={country.isoCode} value={country.name}>
              {country.name}
            </option>
          ))}
        </IconSelect>
      </div>

      <div className={styles["form-group"]}>
        <label htmlFor="state">
          State <span className={styles.optional}>Optional</span>
        </label>
        <IconSelect
          icon="map"
          id="state"
          name="state"
          disabled={!countryName || !hasStates}
          value={stateName}
          onChange={(event) => {
            onStateChange(event.target.value);
            onCityChange("");
          }}
        >
          <option value="">
            {!countryName
              ? "Select a country first"
              : hasStates
                ? "Select a state"
                : "No states available"}
          </option>
          {[...states]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((state) => (
              <option key={state.isoCode} value={state.name}>
                {state.name}
              </option>
            ))}
        </IconSelect>
      </div>

      <div className={styles["form-group"]}>
        <label htmlFor="city">
          City <span className={styles.optional}>Optional</span>
        </label>
        <IconSelect
          icon="building"
          id="city"
          name="city"
          disabled={
            !countryName || (hasStates && !stateName) || cities.length === 0
          }
          value={cityName}
          onChange={(event) => onCityChange(event.target.value)}
        >
          <option value="">
            {!countryName
              ? "Select a country first"
              : hasStates && !stateName
                ? "Select a state first"
                : cities.length
                  ? "Select a city"
                  : "No cities available"}
          </option>
          {[...cities]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((city) => (
              <option key={city.stateCode + "-" + city.name} value={city.name}>
                {city.name}
              </option>
            ))}
        </IconSelect>
      </div>
    </>
  );
}
