import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { MapPin, Search, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyMapState } from '@/components/ui/EmptyState';

interface EircodeAddressLookupProps {
  value?: string;
  onChange?: (address: string, eircode?: string) => void;
  showMap?: boolean;
  className?: string;
}

interface AddressResult {
  address: string;
  eircode: string;
  latitude?: number;
  longitude?: number;
}

export function EircodeAddressLookup({
  value = '',
  onChange,
  showMap = true,
  className,
}: EircodeAddressLookupProps) {
  const [address, setAddress] = useState(value);
  const [eircode, setEircode] = useState('');
  const [loading, setLoading] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [mapError, setMapError] = useState(false);

  // Validate Irish Eircode format (e.g., D02 X285, A65 F4E2)
  const isValidEircode = (code: string): boolean => {
    const eircodeRegex = /^[A-Z]\d{2}\s?[A-Z0-9]{4}$/i;
    return eircodeRegex.test(code.trim());
  };

  const lookupAddress = useCallback(async () => {
    const searchQuery = eircode || address;
    if (!searchQuery.trim()) {
      toast.error('Please enter an address or Eircode');
      return;
    }

    setLoading(true);
    setMapError(false);

    try {
      // Use OpenStreetMap Nominatim API for geocoding (free, no API key required)
      const encodedQuery = encodeURIComponent(
        eircode && isValidEircode(eircode) 
          ? `${eircode}, Ireland` 
          : `${searchQuery}, Ireland`
      );
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&countrycodes=ie&limit=1`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'SolarCRM/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }

      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const newCoordinates = {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
        };
        
        setCoordinates(newCoordinates);
        
        // Update address if we found a better one
        if (result.display_name) {
          const formattedAddress = result.display_name
            .split(',')
            .slice(0, 4)
            .join(', ')
            .trim();
          
          setAddress(formattedAddress);
          onChange?.(formattedAddress, eircode);
        }
        
        toast.success('Location found!');
      } else {
        toast.error('Address not found. Try a different search term.');
        setCoordinates(null);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast.error('Failed to lookup address. Please try again.');
      setMapError(true);
    } finally {
      setLoading(false);
    }
  }, [address, eircode, onChange]);

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value;
    setAddress(newAddress);
    onChange?.(newAddress, eircode);
  };

  const handleEircodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEircode = e.target.value.toUpperCase();
    setEircode(newEircode);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      lookupAddress();
    }
  };

  const openInGoogleMaps = () => {
    if (coordinates) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`,
        '_blank'
      );
    } else if (address) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ', Ireland')}`,
        '_blank'
      );
    }
  };

  // Generate static map URL using OpenStreetMap
  const getMapImageUrl = () => {
    if (!coordinates) return null;
    // Using OpenStreetMap static map service
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${coordinates.lat},${coordinates.lng}&zoom=16&size=400x200&markers=${coordinates.lat},${coordinates.lng},lightblue`;
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Address Lookup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              placeholder="Enter street address..."
              value={address}
              onChange={handleAddressChange}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eircode">Eircode</Label>
            <Input
              id="eircode"
              placeholder="e.g. D02 X285"
              value={eircode}
              onChange={handleEircodeChange}
              onKeyDown={handleKeyDown}
              className={eircode && !isValidEircode(eircode) ? 'border-destructive' : ''}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={lookupAddress}
            disabled={loading || (!address && !eircode)}
            className="flex-1"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            {loading ? 'Searching...' : 'Find Location'}
          </Button>
          {(coordinates || address) && (
            <Button variant="outline" onClick={openInGoogleMaps}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Google Maps
            </Button>
          )}
        </div>

        {showMap && (
          <div className="rounded-lg overflow-hidden border bg-muted min-h-[200px]">
            {coordinates && !mapError ? (
              <div className="relative">
                <img
                  src={getMapImageUrl() || ''}
                  alt="Location map"
                  className="w-full h-[200px] object-cover"
                  onError={() => setMapError(true)}
                />
                <div className="absolute bottom-2 right-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="shadow-md"
                    onClick={openInGoogleMaps}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Full Map
                  </Button>
                </div>
              </div>
            ) : mapError ? (
              <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                <p>Map preview unavailable. Use the Google Maps button to view location.</p>
              </div>
            ) : (
              <EmptyMapState />
            )}
          </div>
        )}

        {coordinates && (
          <p className="text-xs text-muted-foreground text-center">
            Coordinates: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default EircodeAddressLookup;
