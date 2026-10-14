import {it,expect} from 'vitest';
import {searchFixtures} from './variant';
import {fixtures} from '../fixtures/variants';
it('searches case-insensitively and resolves demo aliases',()=>{expect(searchFixtures(fixtures,' EXAMPLE-BETA ').map(x=>x.id)).toEqual(['sample-002']);expect(searchFixtures(fixtures,'not-here')).toEqual([]);expect(searchFixtures(fixtures,'')).toBe(fixtures);});
