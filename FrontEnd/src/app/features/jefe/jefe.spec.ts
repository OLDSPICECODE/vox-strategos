import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Jefe } from './jefe';

describe('Jefe', () => {
  let component: Jefe;
  let fixture: ComponentFixture<Jefe>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Jefe]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Jefe);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
