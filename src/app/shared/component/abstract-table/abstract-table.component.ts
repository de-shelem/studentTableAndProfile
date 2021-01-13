import {Directive, Inject, Injectable, OnInit, QueryList, ViewChild, ViewChildren} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {HttpHeaders, HttpResponse} from '@angular/common/http';
import {AbstractEntryService} from '../../service/abstract.service';
import {combineLatest} from 'rxjs';
import {map} from 'rxjs/operators';
import {SearchWithPagination} from '../../util/request-util';
import {CheckboxComponent, MdbCheckboxChange, ModalDirective, ToastService} from 'ng-uikit-pro-standard';
import * as convert_layout_ru from 'convert-layout/ru';
import * as convert_layout_ua from 'convert-layout/uk';
import {TranslateService} from '@ngx-translate/core';

@Directive()
export abstract class AbstractTableComponent<T> implements OnInit {

  @ViewChildren('elementCheckboxComponent') elementCheckboxComponentRefs: QueryList<CheckboxComponent>;

  @ViewChild('mainCheckboxComponent') mainCheckboxComponentRef: CheckboxComponent;

  @ViewChild('warningFrameNotPossibleDeletion') warningFrameNotPossibleDeletionRef: ModalDirective;

  selectedElementsForDelete: T[] = [];

  elements: T[] = [];

  isTemplate = false;


  selectedElement: T;

  searchText = '';

  columns: string[] = [];

  itemsPerPages = [7, 10, 20, 50, 100];

  allPropertyNames: any[] = [];

  totalItems = 0;
  itemsPerPage = 7;
  page!: number;

  predicate!: string;
  ascending!: boolean;

  queryFilterParams: any = {};

  cyrillicReg: RegExp = /^[\u0400-\u04FF ]+$/;
  englishReg: RegExp = /^[A-Za-z\`\,\.\/\;\'\[\] ]+$/;

  repeatSearchText = '';

  isRussianLanguage = false;
  isUkrainianLanguage = false;


  protected constructor(public entryService: AbstractEntryService<T>, public router: Router, public activatedRoute: ActivatedRoute,
                        public translate?: TranslateService,
                        public toastService?: ToastService) {
  }

  ngOnInit(): void {
    this.handleNavigation();
    this.setVisibleFields();
  }

  handleNavigation(): void {
    combineLatest([this.activatedRoute.data, this.activatedRoute.queryParamMap]).pipe(map(([data, params]) => {
      const page = params.get('page');
      this.page = page !== null ? +page : 1;
      const sort = (params.get('sort') ?? data.defaultSort).split(',');
      this.predicate = sort[0];
      this.ascending = sort[1] === 'asc';
      let query = params.get('query');
      if (!!query) {
        this.searchText = query;
      }
      this.selectedElementsForDelete.length = 0;
      if (this.mainCheckboxComponentRef !== undefined) {
        if (this.mainCheckboxComponentRef.checked == true) {
          this.mainCheckboxComponentRef.toggle();
        }
      }
      this.loadAll();
    })).subscribe();
  }

  transition(): void {
    if (Array.isArray(this.elements)) {
      let queryParams: { page?: number, sort?: string, query?: string } = {
        page: this.page,
        sort: this.predicate + ',' + (this.ascending ? 'asc' : 'desc'),
      };
      if (this.searchText) {
        queryParams.query = this.searchText;
      }
      this.router.navigate(['./'], {
        relativeTo: this.activatedRoute.parent,
        queryParams: queryParams,
      });
    }
  }

  sortBy(field: string) {
    this.predicate = field;
    this.ascending = !this.ascending;
    this.loadAll();
    this.transition();
  }

  searchItems(keyword: string) {
    this.searchText = keyword;
    let self = this;
    setTimeout(() => {
      this.transition();
    }, 1000);
  }

  selectRow(element: T) {
    this.selectedElement = element;
  }

  loadAll(): void {
    let requestParams: SearchWithPagination = {
      page: this.page - 1,
      size: this.itemsPerPage,
      sort: this.sort(),
    };
    if (this.queryFilterParams !== undefined) {
      if (!!this.queryFilterParams.fieldNames && !!this.queryFilterParams.fieldValue) {
        requestParams.fieldNames = this.queryFilterParams.fieldNames;
        requestParams.fieldValue = this.queryFilterParams.fieldValue;
      }
    }
    if (!!this.searchText) {
      requestParams.query = this.isUkrainianLanguage || this.isRussianLanguage ? this.repeatSearchText : this.searchText;
    }
    if (this.isTemplate) {
      this.entryService.queryByIsTemplate(this.isTemplate, requestParams).subscribe(
        (res: HttpResponse<T[]>) => this.onSuccess(res.body, res.headers),
        error => console.error(error));
    } else {
      this.entryService.query(requestParams).subscribe(
        (res: HttpResponse<T[]>) => this.onSuccess(res.body, res.headers),
        error => console.error(error));
    }
  }

  sort(): string[] {
    const result = [this.predicate + ',' + (this.ascending ? 'asc' : 'desc')];
    if (this.predicate !== 'uuid') {
      result.push('uuid');
    }
    return result;
  }

  showWarning(massage: string) {
    const options = {
      timeOut: 3000,
      toastClass: 'warning-toast',
      titleClass: 'title-warning-toast',
      messageClass: 'message-warning-toast',
      opacity: 0.8,
    };
    this.toastService.warning(`${this.translate.instant('PERHAPS_YOU_MEANT')}: ${massage}`, '', options);
  }

  repeatLoadAll() {
    if (this.totalItems == 0 && (this.cyrillicReg.test(this.searchText) || this.englishReg.test(this.searchText))) {
      if (this.englishReg.test(this.searchText)) {
        if (!this.isRussianLanguage) {
          this.repeatSearchText = convert_layout_ru.fromEn(this.searchText);
          this.isRussianLanguage = true;
        } else {
          this.repeatSearchText = convert_layout_ua.fromEn(this.searchText);
          this.isUkrainianLanguage = true;
        }
      } else {
        if (!this.isRussianLanguage) {
          this.repeatSearchText = convert_layout_ru.toEn(this.searchText);
          this.isRussianLanguage = true;
        } else {
          this.repeatSearchText = convert_layout_ua.toEn(this.searchText);
          this.isUkrainianLanguage = true;
        }
      }
      this.loadAll();
    }
  }

  onSuccess(entries: T[] | null, headers: HttpHeaders): void {
    this.totalItems = Number(headers.get('X-Total-Count'));
    this.elements = entries;
    if ((this.isUkrainianLanguage || this.isRussianLanguage) && (this.totalItems != 0) && !!this.searchText) {
      if (this.englishReg.test(this.searchText)) {
        this.showWarning(convert_layout_ru.fromEn(this.searchText));
      } else {
        this.showWarning(convert_layout_ru.toEn(this.searchText));
      }
    }
    if (this.totalItems == 0 && this.isUkrainianLanguage) {
      this.isUkrainianLanguage = false;
      this.isRussianLanguage = false;
    } else {
      if (this.totalItems != 0 && this.isRussianLanguage) {
        this.isRussianLanguage = false;
      }
      this.repeatSearchText = this.searchText;
      this.repeatLoadAll();
    }
  }

  onElementChanged(element: T): void {
    this.entryService.save(element).subscribe(() => this.loadAll());
  }

  onElementDeleted(element: T) {
    this.entryService.delete(element['uuid']).subscribe(() => this.loadAll());
  }

  deleteSelectedElements(): void {
    this.entryService.deleteElements(this.selectedElementsForDelete).subscribe(
      () => {
        this.selectedElementsForDelete.length = 0;
        this.loadAll();
      },
      () => this.warningFrameNotPossibleDeletionRef.show());
  }

  onChangeElementCheckbox(checkbox: MdbCheckboxChange, element: T) {
    if (checkbox.checked == true) {
      this.selectedElementsForDelete.push(element);
    } else if (checkbox.checked == false) {
      const removeIndex = this.selectedElementsForDelete.map(value => {
        return value['uuid'];
      }).indexOf(element['uuid']);
      this.selectedElementsForDelete.splice(removeIndex, 1);
      if (this.selectedElementsForDelete.length == 0 && this.mainCheckboxComponentRef.checked == true) {
        this.mainCheckboxComponentRef.toggle();
      }
    }
  }

  onChangeMainCheckbox(checkbox: MdbCheckboxChange) {
    if (checkbox.checked == true) {
      this.selectedElementsForDelete = this.elements.slice(0);
      this.elementCheckboxComponentRefs.forEach(value => {
        if (!value.checked) {
          value.toggle();
        }
      });
    } else if (checkbox.checked == false) {
      this.selectedElementsForDelete.length = 0;
      this.elementCheckboxComponentRefs.forEach(value => {
        if (value.checked) {
          value.toggle();
        }
      });
    }
  }

  getMinItemsOnCurrPage(): number {
    if (this.totalItems != 0) {
      if (this.page == 1) {
        return 1;
      }
      return 1 + this.itemsPerPage * (this.page - 1);
    }
    return -1;
  }

  getMaxItemsOnCurrPage(): number {
    if (this.totalItems != 0) {
      if (this.page == 1) {
        return this.itemsPerPage > this.totalItems ? this.totalItems : this.itemsPerPage;
      } else if (this.itemsPerPage * this.page > this.totalItems) {
        return this.totalItems;
      } else {
        return this.itemsPerPage * this.page;
      }
    }
    return -1;
  }

  protected setVisibleFields() {
    for (let fields of this.allPropertyNames) {
      if (fields.selected) {
        this.columns.push(fields.name);
      }
    }
  }

  fieldsFilters(element: string) {
    const index = this.columns.indexOf(element);
    if (index > -1) {
      this.columns.splice(index, 1);
    } else {
      this.columns.push(element);
    }
  }


  setNumberOfElementsOnPage(s: any) {
    if (this.itemsPerPage != s) {
      this.itemsPerPage = s;
      this.loadAll();
      this.mainCheckboxComponentRef.checked = false;
      this.selectedElementsForDelete = [];
    }
    console.log(this.selectedElementsForDelete);
  }

}
