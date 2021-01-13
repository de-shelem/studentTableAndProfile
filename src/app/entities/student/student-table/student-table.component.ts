import {Component, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {Student} from '../../../shared/model/student.model';
import {StudentService} from '../../../shared/service/student.service';
import {StudentEditModalComponent} from '../student-edit-modal/student-edit-modal.component';
import {LanguageLevelService} from '../../../shared/service/language-level.service';
import {LanguageLevel} from '../../../shared/model/language-level.model';
import {Group} from '../../../shared/model/group.model';
import {GroupService} from '../../../shared/service/group.service';
import {MDBModalRef, ToastService} from 'ng-uikit-pro-standard';
import {TranslateService} from '@ngx-translate/core';
import {NgForm} from '@angular/forms';
import {StudentFilter} from '../../../shared/model/search-model/studentFilter.model';
import * as moment from 'moment';
import {AbstractTableComponent} from '../../../shared/component/abstract-table/abstract-table.component';

@Component({
  selector: 'lms-student-table',
  templateUrl: './student-table.component.html',
  styleUrls: ['./student-table.component.scss'],
  encapsulation: ViewEncapsulation.None
})

export class StudentTableComponent extends AbstractTableComponent<Student> implements OnInit {
  @ViewChild('addToGroup', {static: true}) addToGroupModal: MDBModalRef;
  @ViewChild('editModal', {static: true}) editModal: StudentEditModalComponent;
  student: Student | null = null;
  namespace = 'student';
  columns: string[] = ['fullName'];

  languageLevels: LanguageLevel[] = [];
  groups: Group[] = [];
  tempGroups: Group[] = [];
  tempLanguageLevels: LanguageLevel[] = [];
  birthDayFilter?: Date;

  public studentFilter = new StudentFilter();
  public selectLanguageLevels?: LanguageLevel[];
  public selectGroups?: Group[];
  public selectedGroup?: Group;
  public age?: number;
  public date?: Date;
  public loading = false;
  public buttonTypeSwitch = false;
  allPropertyNames: any[] = [
    {selected: true, name: 'contacts'},
    {selected: true, name: 'languageLevels'},
    {selected: true, name: 'groups'}];


  constructor(public entryService: StudentService,
              public router: Router,
              public activatedRoute: ActivatedRoute,
              private languageLevelService: LanguageLevelService,
              public groupService: GroupService,
              public toastService: ToastService,
              public translate: TranslateService,
  ) {
    super(entryService, router, activatedRoute, translate, toastService);
  }

  ngOnInit(): void {
    this.handleNavigation();
    this.setVisibleFields();
    this.languageLevelService.getAll().subscribe(value1 => {
      this.selectLanguageLevels = value1;
    });
    this.groupService.getAll().subscribe(value1 => {
      this.selectGroups = value1;
    });
  }

  filterStudent(form: NgForm): void {

    console.log(this.birthDayFilter);
    this.studentFilter.groups = '';
    this.studentFilter.languageLevels = '';
    this.studentFilter.email = form.value.email.trim();
    if (this.birthDayFilter != null) {
      this.studentFilter.birthDay = moment(this.birthDayFilter).format('YYYY-MM-DD').trim();
    } else {
      this.studentFilter.birthDay = '';
    }
    this.studentFilter.fullName = form.value.fullName.trim();
    if (this.tempGroups.length > 0) {
      this.groups = this.tempGroups;
      this.studentFilter.groups = this.createQueryString(this.tempGroups);
    }
    if (this.tempLanguageLevels.length > 0) {
      this.languageLevels = this.tempLanguageLevels;
      this.studentFilter.languageLevels = this.createQueryString(this.tempLanguageLevels);
    }
    this.setQueryFilterParamsAndLoadAll();
  }

  public calculateAge(birthDay: Date): number {
    this.date = new Date();
    const bdate = new Date(birthDay);
    bdate.getDay();
    bdate.getDate();
    bdate.getMonth();
    bdate.getFullYear();
    var currentDate = this.date.getDate();
    var currentMonth = this.date.getMonth() + 1;
    var currentYear = this.date.getFullYear();
    var birthDate = bdate.getDate();
    var birthMonth = bdate.getMonth() + 1;
    var birthYear = bdate.getFullYear();

    this.age = currentYear - birthYear;
    if (currentMonth < birthMonth) {
      this.age = this.age - 1;
    } else if (currentMonth == birthMonth) {
      if (currentDate < birthDate) {
        this.age = this.age - 1;
      }
    }
    return this.age;
  }

  addStudent(): void {
    this.router.navigate(['students', 'new-student']);
  }

  addStudentInGroup(student: Student): void {
    this.router.navigate(['students', student.username, 'group-selection']);
  }

  editStudent(): void {
    if (this.selectedElementsForDelete.length == 1) {
      this.router.navigate(['students', this.selectedElementsForDelete[0].username, 'profile']);
    }
  }

  addStudentsToGroup(): void {
    this.loading = true;
    let newStudentInGroup = false;
    for (const element of this.selectedElementsForDelete) {
      const index = this.selectedGroup.students.map(function(e) {
        return e.username;
      }).indexOf(element.username);

      if (index === -1) {
        newStudentInGroup = true;
        this.selectedGroup.students.push(element);
      }
    }
    if (newStudentInGroup) {

      this.groupService.save(this.selectedGroup).subscribe(value => {
        this.addToGroupModal.hide();
        this.loading = false;
        this.loadAll();
        this.groupService.getAll().subscribe(value1 => {
          this.selectGroups = value1;
        });

      }, error => {
        this.addToGroupModal.hide();
        this.loading = false;
      });
    } else {
      this.addToGroupModal.hide();
    }
    this.selectedElementsForDelete = [];
  }

  setQueryFilterParamsAndLoadAll(): void {
    if (Object.values(this.studentFilter).filter((v) => !!v).length > 0) {
      this.queryFilterParams.fieldNames = Object.keys(this.studentFilter);
      this.queryFilterParams.fieldValue = Object.values(this.studentFilter);
    } else {
      this.queryFilterParams.fieldNames = '';
      this.queryFilterParams.fieldValue = '';
    }
    this.loadAll();
  }

  createQueryString(objects): string {
    let queryString = '';
    objects.forEach((object, i) => {
      if (i == 0) {
        queryString += object.uuid;
      } else {
        queryString += ',' + object.uuid;
      }
    });
    return queryString;
  }

  resetFrom(form: NgForm): void {
    form.reset({
      email: this.studentFilter.email !== undefined ? this.studentFilter.email : '',
      birthDay: this.studentFilter.birthDay !== undefined ? this.studentFilter.birthDay : '',
      fullName: this.studentFilter.fullName !== undefined ? this.studentFilter.fullName : '',
    });
    this.tempGroups = this.groups;
    this.tempLanguageLevels = this.languageLevels;
  }
}
