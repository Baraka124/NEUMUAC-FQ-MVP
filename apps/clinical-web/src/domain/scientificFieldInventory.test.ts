import {it,expect} from 'vitest';
import {scientificFieldInventory} from './scientificFieldInventory';
import type {ScientificDossier} from '../services/scientificDossier';

it('only inventories recorded fields, including zero validation count, without evaluating scientific quality',()=>{
 const dossier:ScientificDossier={
  id:'383',functionalClass:'I',subtype:null,recordedDetermination:null,
  confidence:null,sourceSummary:'CFTR catalog',dataStatus:null,
  validationCount:0,lastValidatedAt:null,lastEvidenceUpdate:'',clinvarId:null
 };
 const inventory=scientificFieldInventory(dossier);
 expect(inventory.recorded).toEqual(['Functional class','Source summary','Validation count']);
 expect(inventory.absent).toContain('Last evidence update');
 expect(inventory.absent).toContain('Determination');
 expect(inventory.recorded.length+inventory.absent.length).toBe(10);
 expect(JSON.stringify(inventory)).not.toMatch(/grade|quality|clinical|strength/);
});
