import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { CategoriesComponent } from './categories.component';

describe('CategoriesComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoriesComponent],
      providers: [provideHttpClient()],
    })
      .overrideComponent(CategoriesComponent, {
        set: { template: '' },
      })
      .compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(CategoriesComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
