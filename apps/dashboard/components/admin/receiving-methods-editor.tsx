"use client";



import type { FamilyReceivingMethod, ReceivingMethodTypeValue } from "@muakhah/contracts";

import { useI18n } from "@muakhah/i18n";

import styles from "@/app/dashboard/dashboard.module.css";



const METHOD_TYPES: ReceivingMethodTypeValue[] = [

  "bank_of_palestine",

  "usdt",

  "iban",

  "bank_transfer",

  "personal_pickup",

  "digital_wallet",

  "other",

];



type ReceivingMethodsEditorProps = {

  methods: FamilyReceivingMethod[];

  onChange: (methods: FamilyReceivingMethod[]) => void;

};



function emptyMethod(method: ReceivingMethodTypeValue): FamilyReceivingMethod {

  return { method };

}



type FieldProps = {

  label: string;

  value: string;

  onChange: (value: string) => void;

  required?: boolean;

  placeholder?: string;

  multiline?: boolean;

};



function ReceivingField({

  label,

  value,

  onChange,

  required = false,

  placeholder,

  multiline = false,

}: FieldProps) {

  return (

    <div className={`${styles["form-field"]} ${multiline ? styles.full : ""}`}>

      <label>{label}</label>

      {multiline ? (

        <textarea

          value={value}

          onChange={(e) => onChange(e.target.value)}

          required={required}

          placeholder={placeholder}

        />

      ) : (

        <input

          type="text"

          value={value}

          onChange={(e) => onChange(e.target.value)}

          required={required}

          placeholder={placeholder}

        />

      )}

    </div>

  );

}



export function ReceivingMethodsEditor({

  methods,

  onChange,

}: ReceivingMethodsEditorProps) {

  const { t } = useI18n();



  function updateMethod(index: number, patch: Partial<FamilyReceivingMethod>) {

    onChange(methods.map((m, i) => (i === index ? { ...m, ...patch } : m)));

  }



  function removeMethod(index: number) {

    onChange(methods.filter((_, i) => i !== index));

  }



  function addMethod(method: ReceivingMethodTypeValue) {

    onChange([...methods, emptyMethod(method)]);

  }



  function renderMethodFields(method: FamilyReceivingMethod, index: number) {

    const field = (key: keyof FamilyReceivingMethod, labelKey: string, opts?: { multiline?: boolean; placeholder?: string; required?: boolean }) => (

      <ReceivingField

        key={String(key)}

        label={t(labelKey)}

        value={(method[key] as string | undefined) ?? ""}

        onChange={(value) => updateMethod(index, { [key]: value })}

        required={opts?.required ?? true}

        placeholder={opts?.placeholder}

        multiline={opts?.multiline}

      />

    );



    switch (method.method) {

      case "bank_of_palestine":

        return (

          <>

            {field("accountHolder", "families.receivingFields.accountHolder")}

            {field("accountNumber", "families.receivingFields.accountNumber")}

            {field("branch", "families.receivingFields.branch")}

            {field("notes", "families.receivingFields.notes", { required: false, multiline: true })}

          </>

        );

      case "usdt":

        return (

          <>

            {field("usdtNetwork", "families.receivingFields.usdtNetwork", {

              placeholder: "TRC20 / ERC20",

            })}

            {field("walletAddress", "families.receivingFields.walletAddress")}

            {field("notes", "families.receivingFields.notes", { required: false, multiline: true })}

          </>

        );

      case "iban":

        return (

          <>

            {field("bankName", "families.receivingFields.bankName")}

            {field("accountHolder", "families.receivingFields.accountHolder")}

            {field("iban", "families.receivingFields.iban")}

            {field("swiftBic", "families.receivingFields.swiftBic")}

            {field("country", "families.receivingFields.country")}

            {field("notes", "families.receivingFields.notes", { required: false, multiline: true })}

          </>

        );

      case "bank_transfer":

        return (

          <>

            {field("bankName", "families.receivingFields.bankName")}

            {field("accountNumber", "families.receivingFields.accountNumber")}

            {field("accountHolder", "families.receivingFields.accountHolder")}

            {field("notes", "families.receivingFields.notes", { required: false, multiline: true })}

          </>

        );

      case "personal_pickup":

        return (

          <>

            {field("receiverName", "families.receivingFields.receiverName")}

            {field("receiverRelationship", "families.receivingFields.receiverRelationship")}

            {field("generalArea", "families.receivingFields.generalArea")}

            {field("notes", "families.receivingFields.notes", { required: false, multiline: true })}

          </>

        );

      case "digital_wallet":

        return (

          <>

            {field("walletProvider", "families.receivingFields.walletProvider")}

            {field("walletId", "families.receivingFields.walletId")}

            {field("notes", "families.receivingFields.notes", { required: false, multiline: true })}

          </>

        );

      case "other":

        return (

          <>

            {field("methodName", "families.receivingFields.methodName")}

            {field("methodDescription", "families.receivingFields.methodDescription", {

              multiline: true,

            })}

            {field("receivingDetails", "families.receivingFields.receivingDetails", {

              multiline: true,

            })}

            {field("notes", "families.receivingFields.notes", { required: false, multiline: true })}

          </>

        );

      default:

        return null;

    }

  }



  return (

    <div className={styles["receiving-methods"]}>

      {methods.length === 0 ? (

        <p className={styles["receiving-methods-empty"]}>

          {t("families.form.receivingMethodsEmpty")}

        </p>

      ) : (

        methods.map((method, index) => (

          <div key={`${method.method}-${index}`} className={styles["receiving-method-card"]}>

            <div className={styles["receiving-method-header"]}>

              <strong>

                {t("families.form.receivingMethodNumber", { number: String(index + 1) })}

                {": "}

                {t(`families.receivingMethods.${method.method}`)}

              </strong>

              <button

                type="button"

                className={styles["btn-filter-clear"]}

                onClick={() => removeMethod(index)}

              >

                {t("common.delete")}

              </button>

            </div>

            <p className={styles["receiving-method-details-label"]}>

              {t("families.form.receivingMethodDetails")}

            </p>

            <div className={styles["form-grid"]}>{renderMethodFields(method, index)}</div>

          </div>

        ))

      )}



      <div className={styles["receiving-methods-add"]}>

        <p className={styles["receiving-methods-add__label"]}>

          {t("families.form.addReceivingMethod")}

        </p>

        <div className={styles["receiving-methods-add__grid"]}>

          {METHOD_TYPES.map((method) => (

            <button

              key={method}

              type="button"

              className={styles["receiving-method-add-btn"]}

              onClick={() => addMethod(method)}

            >

              + {t(`families.receivingMethods.${method}`)}

            </button>

          ))}

        </div>

      </div>

    </div>

  );

}


