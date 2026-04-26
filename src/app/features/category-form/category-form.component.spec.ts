import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { CategoryFormComponent } from './category-form.component';

describe('CategoryFormComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryFormComponent],
      providers: [provideHttpClient()],
    })
      .overrideComponent(CategoryFormComponent, {
        set: { template: '' },
      })
      .compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(CategoryFormComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
