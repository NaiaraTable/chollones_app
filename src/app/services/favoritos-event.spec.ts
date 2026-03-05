import { TestBed } from '@angular/core/testing';

import { FavoritosEvent } from './favoritos-event';

describe('FavoritosEvent', () => {
  let service: FavoritosEvent;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FavoritosEvent);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
