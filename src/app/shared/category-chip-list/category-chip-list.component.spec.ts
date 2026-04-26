import { TestBed } from '@angular/core/testing';
import { CategoryChipListComponent } from './category-chip-list.component';

describe('CategoryChipListComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryChipListComponent],
    })
      .overrideComponent(CategoryChipListComponent, {
        set: { template: '' },
      })
      .compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(CategoryChipListComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
