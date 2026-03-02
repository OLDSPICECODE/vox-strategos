import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectDetailsModalComponent } from './project-details-modal';

describe('ProjectDetailsModal', () => {
  let component: ProjectDetailsModalComponent;
  let fixture: ComponentFixture<ProjectDetailsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectDetailsModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectDetailsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
