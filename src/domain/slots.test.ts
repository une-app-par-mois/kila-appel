import { labels } from '@/config/libelles';
import { endTime, normalizeTime, parseDuration } from '@/domain/slots';

describe('EX-07 durée et horaire d’un créneau', () => {
  it.each([
    ['90', 90],
    [' 1 h 30 ', 90],
    ['1h30', 90],
    ['1H30', 90],
    ['2 h', 120],
    ['2h', 120],
    ['45 min', 45],
    ['1 h 05', 65],
  ])('EX-07 lit la durée %j : %p min', (text, minutes) => {
    expect(parseDuration(text)).toBe(minutes);
  });

  it.each(['', 'une heure', '1 h 60', '1,5', '1:30', 'h30', '-30'])(
    'EX-07 refuse la durée %j',
    (text) => {
      expect(parseDuration(text)).toBeNull();
    },
  );

  it.each([
    [90, '1 h 30'],
    [120, '2 h'],
    [45, '45 min'],
    [65, '1 h 05'],
  ])('EX-07 affiche %p min : %j', (minutes, text) => {
    expect(labels.duration(minutes)).toBe(text);
  });

  it.each([
    ['9:00', '09:00'],
    ['9h00', '09:00'],
    [' 18 h 30 ', '18:30'],
    ['14:00', '14:00'],
    ['24:00', '24:00'],
    ['9h', '9h'],
  ])('EX-07 écrit l’heure %j comme %j (sinon telle quelle)', (text, time) => {
    expect(normalizeTime(text)).toBe(time);
  });

  it('EX-07 heure de fin, après minuit comprise', () => {
    expect(endTime('14:00', 90)).toBe('15:30');
    expect(endTime('23:30', 60)).toBe('00:30');
    expect(endTime('00:00', 1440)).toBe('00:00');
  });
});
