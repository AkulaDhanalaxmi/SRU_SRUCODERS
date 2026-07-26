import { computeBuyReady } from './productDetailUtils';

describe('computeBuyReady delivery logic', () => {
  it('does not mark delivery as late when the selected option arrives before a future event', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const result = computeBuyReady({
      selectedSize: 'M',
      selectedPref: 'event',
      selectedDelivery: 'free',
      selectedDeliveryType: 'standard',
      hasEvent: true,
      eventDate: futureDate.toISOString().slice(0, 10),
      deliveryData: {
        options: [{ type: 'standard', days: 3 }],
      },
    });

    expect(result.items.delivery).toBe('ok');
    expect(result.level).toBe('ready');
  });

  it('marks delivery as warn when the selected option would miss a near event', () => {
    const nearDate = new Date();
    nearDate.setDate(nearDate.getDate() + 1);
    const result = computeBuyReady({
      selectedSize: 'M',
      selectedPref: 'event',
      selectedDelivery: 'free',
      selectedDeliveryType: 'standard',
      hasEvent: true,
      eventDate: nearDate.toISOString().slice(0, 10),
      deliveryData: {
        options: [{ type: 'standard', days: 3 }],
      },
    });

    expect(result.items.delivery).toBe('warn');
    expect(result.level).toBe('almost');
  });
});

describe('computeBuyReady fit logic', () => {
  it('warns when selected size is not M or L', () => {
    const result = computeBuyReady({
      selectedSize: 'S',
      selectedPref: 'casual',
      selectedDeliveryType: 'standard',
      hasEvent: false,
    });

    expect(result.items.fit).toBe('warn');
    expect(result.level).toBe('almost');
  });

  it('marks fit ok when selected size is M or L', () => {
    const result = computeBuyReady({
      selectedSize: 'L',
      selectedPref: 'casual',
      selectedDeliveryType: 'standard',
      hasEvent: false,
    });

    expect(result.items.fit).toBe('ok');
    expect(result.level).toBe('ready');
  });
});
