/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps } from "@aws-amplify/ui-react";
export declare type EscapeHatchProps = {
    [elementHierarchy: string]: Record<string, unknown>;
} | null;
export declare type VariantValues = {
    [key: string]: string;
};
export declare type Variant = {
    variantValues: VariantValues;
    overrides: EscapeHatchProps;
};
export declare type ValidationResponse = {
    hasError: boolean;
    errorMessage?: string;
};
export declare type ValidationFunction<T> = (value: T, validationResponse: ValidationResponse) => ValidationResponse | Promise<ValidationResponse>;
export declare type LocationsUpdateFormInputValues = {};
export declare type LocationsUpdateFormValidationValues = {};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type LocationsUpdateFormOverridesProps = {
    LocationsUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
} & EscapeHatchProps;
export declare type LocationsUpdateFormProps = React.PropsWithChildren<{
    overrides?: LocationsUpdateFormOverridesProps | undefined | null;
} & {
    id?: string;
    locations?: any;
    onSubmit?: (fields: LocationsUpdateFormInputValues) => LocationsUpdateFormInputValues;
    onSuccess?: (fields: LocationsUpdateFormInputValues) => void;
    onError?: (fields: LocationsUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: LocationsUpdateFormInputValues) => LocationsUpdateFormInputValues;
    onValidate?: LocationsUpdateFormValidationValues;
} & React.CSSProperties>;
export default function LocationsUpdateForm(props: LocationsUpdateFormProps): React.ReactElement;
