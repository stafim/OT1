import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin } from "lucide-react";

declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps?: () => void;
  }
}

interface AddressComponents {
  address: string;
  addressNumber: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  formattedAddress: string;
  latitude?: number;
  longitude?: number;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: AddressComponents) => void;
  onInputChange?: (value: string) => void;
  placeholder?: string;
  testId?: string;
}

let isScriptLoading = false;
let isScriptLoaded = false;

function loadGoogleMapsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isScriptLoaded && window.google?.maps?.places) {
      resolve();
      return;
    }

    if (isScriptLoading) {
      const checkInterval = setInterval(() => {
        if (isScriptLoaded && window.google?.maps?.places) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      return;
    }

    isScriptLoading = true;

    fetch("/api/integrations/google-maps/api-key")
      .then((res) => res.json())
      .then(({ apiKey }) => {
        if (!apiKey) {
          reject(new Error("Google Maps API key not configured"));
          return;
        }

        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=pt-BR`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
          isScriptLoaded = true;
          isScriptLoading = false;
          resolve();
        };

        script.onerror = () => {
          isScriptLoading = false;
          reject(new Error("Failed to load Google Maps script"));
        };

        document.head.appendChild(script);
      })
      .catch(reject);
  });
}

function parseAddressComponents(place: google.maps.places.PlaceResult): AddressComponents {
  const components: AddressComponents = {
    address: "",
    addressNumber: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    cep: "",
    formattedAddress: place.formatted_address || "",
    latitude: place.geometry?.location?.lat(),
    longitude: place.geometry?.location?.lng(),
  };

  if (!place.address_components) return components;

  for (const component of place.address_components) {
    const types = component.types;

    if (types.includes("street_number")) {
      components.addressNumber = component.long_name;
    }
    if (types.includes("route")) {
      components.address = component.long_name;
    }
    if (types.includes("sublocality_level_1") || types.includes("sublocality")) {
      components.neighborhood = component.long_name;
    }
    if (types.includes("administrative_area_level_2") || types.includes("locality")) {
      components.city = component.long_name;
    }
    if (types.includes("administrative_area_level_1")) {
      components.state = component.short_name;
    }
    if (types.includes("postal_code")) {
      components.cep = component.long_name.replace("-", "");
    }
  }

  return components;
}

export function AddressAutocomplete({
  value,
  onChange,
  onInputChange,
  placeholder = "Digite um endereço...",
  testId = "input-address-autocomplete",
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const initAutocomplete = useCallback(() => {
    if (!inputRef.current || !window.google?.maps?.places) return;

    if (autocompleteRef.current) return;

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ["address"],
      componentRestrictions: { country: "br" },
      fields: ["address_components", "formatted_address", "geometry"],
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (place && place.address_components) {
        const addressData = parseAddressComponents(place);
        setInputValue(addressData.formattedAddress);
        onChange(addressData);
      }
    });

    autocompleteRef.current = autocomplete;
  }, [onChange]);

  useEffect(() => {
    loadGoogleMapsScript()
      .then(() => {
        setIsLoading(false);
        initAutocomplete();
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [initAutocomplete]);

  useEffect(() => {
    if (!isLoading && !error) {
      initAutocomplete();
    }
  }, [isLoading, error, initAutocomplete]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onInputChange?.(newValue);
  };

  if (error) {
    return (
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="pl-9"
          data-testid={testId}
        />
        <p className="text-xs text-destructive mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="pl-9 pr-9"
        data-testid={testId}
        disabled={isLoading}
      />
      {isLoading && (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
