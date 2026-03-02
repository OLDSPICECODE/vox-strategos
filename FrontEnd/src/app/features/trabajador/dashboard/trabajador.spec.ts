import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Trabajador } from './trabajador';

describe('Trabajador', () => {
  let component: Trabajador;
  let fixture: ComponentFixture<Trabajador>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Trabajador]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Trabajador);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
