import {Component, ElementRef, EventEmitter, OnInit, ViewChild, ViewChildren} from '@angular/core';
import {EditModalFields} from '../../../shared/component/abstract-edit-modal/abstract-edit-modal-fields';
import {ActivatedRoute, Router} from '@angular/router';
import {StudentService} from '../../../shared/service/student.service';
import {Contact, ContactType, Gender, Student} from '../../../shared/model/student.model';
import {UserService} from '../../../shared/service/user.service';
import {LanguageLevelService} from '../../../shared/service/language-level.service';
import {UserPreferredScheduleService} from '../../../shared/service/user-preferred-schedule.service';
import {NgForm} from '@angular/forms';
import {StudentBData} from '../../../shared/model/studentBData.model';
import {LanguageLevel} from '../../../shared/model/language-level.model';
import {MDBModalRef, ModalDirective} from 'ng-uikit-pro-standard';
import {TranslateService} from '@ngx-translate/core';
import {GroupService} from '../../../shared/service/group.service';
import {Group} from '../../../shared/model/group.model';
import {CdkDragDrop, CdkDropList, moveItemInArray, transferArrayItem} from '@angular/cdk/drag-drop';
import {Setting} from '../../../shared/model/setting.model';
import {SettingService} from '../../../shared/service/setting.service';
import {MdbFileUploadComponent} from 'mdb-file-upload';

@Component({
  selector: 'lms-student-profile',
  templateUrl: './student-profile.component.html',
  styleUrls: ['./student-profile.component.scss']
})
export class StudentProfileComponent implements OnInit {
  @ViewChildren('input') refInputs: { valid: boolean, validSave: boolean }[];
  @ViewChildren('inputContactAdd') refInputsContactAdd: { valid: boolean, validSave: boolean }[];
  @ViewChildren('inputContactEdit') refInputsContactEdit: { valid: boolean, validSave: boolean }[];
  @ViewChildren('inputGroupsEdit') refInputsGroupsEdit: { valid: boolean, validSave: boolean }[];
  @ViewChild('contactsEdit', {static: true}) contactsEditModal: MDBModalRef;
  @ViewChild('groupsEdit', {static: true}) groupsEditModal: MDBModalRef;
  @ViewChild('contactsAdd', {static: true}) contactsAddModal: MDBModalRef;
  @ViewChild('fieldEditModal', {static: true}) fieldEditModal: MDBModalRef;
  @ViewChild('fieldSettingsModal', {static: true}) fieldSettingsModal: MDBModalRef;
  @ViewChild('dragAndDropGroup', {read: ElementRef, static: false}) dragAndDropGroup: ElementRef;
  @ViewChild('uploader', {static: false}) uploaderImg: MdbFileUploadComponent;
  @ViewChild('saveImgModal', {static: false}) saveImgModal: ModalDirective;

  email: string;
  profileCard: number[] = [1, 2];
  firstCardCol: number[] = [3, 4, 5];
  secondCardCol: number[] = [6, 7, 8];
  activeTabIndex = 0;
  ageOfStudent: number;
  contactType: ContactType;
  studentLoading = true;
  student: Student | null = null;
  private _valid: boolean = true;
  public elementSaved: EventEmitter<Student> = new EventEmitter<Student>();
  public selectContactTypes: any[];
  public selectElements?: any[];
  public selectGender?: any[];
  public availableGroups: Group[];
  public availableLanguageLevels: LanguageLevel[];
  public date: Date;
  public age?: number;
  public studentLastName: string;
  public studentFirstName: string;
  public studentSecondName: string;
  public studentUsername: string;
  public studentGroups: Group[];
  public contact: Contact = new Contact();
  public contacts: Contact[] = [];
  public settings?: Setting;
  studentBData: StudentBData | null = null;

  emailPattern = '^[a-zA-Z0-9.!#$%&\'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$';

  editColumns: EditModalFields[] = [
    {name: 'username', type: 'text'},
    {name: 'firstName', type: 'text'},
    {name: 'lastName', type: 'text'},
    {name: 'secondName', type: 'text'},
    {name: 'birthDay', type: 'date'},
    {name: 'languageLevels', type: 'multiselect-entities'},
    {name: 'groups', type: 'multiselect-entities'},
    {name: 'email', type: 'email'},
    {name: 'colorCode', type: 'color'}
  ];

  namespace = 'student';
  profilePhoto: File | null;

  loading = false;
  isCardEditMode = true;
  contentHeight: any;
  isEditMode = false;


  constructor(private route: ActivatedRoute,
              private router: Router,
              private studentService: StudentService,
              private settingService: SettingService,
              private groupService: GroupService,
              private userService: UserService,
              private languageLevelService: LanguageLevelService,
              private userPreferredScheduleService: UserPreferredScheduleService,
              private translate?: TranslateService
  ) {
  }

  setField(): void {
    if (this.student.uuid) {
      this.isEditMode = true;
    }
    this.contacts = this.student.contacts;
    this.email = this.student.email;
    this.studentLastName = this.student.lastName;
    this.studentFirstName = this.student.firstName;
    this.studentSecondName = this.student.secondName;
    this.studentUsername = this.student.username;
    this.student.contacts = this.student.contacts || [];
    this.studentGroups = this.student.groups;
    if (this.student.birthDay) {
      this.ageOfStudent = this.CalculateAge(this.student.birthDay);
    }

  }

  setValueInSelectInputGender(): void {
    this.selectGender = [{
      value: Gender[Gender.female],
      label: this.translate.instant(Gender[Gender.female])
    }, {
      value: Gender[Gender.male],
      label: this.translate.instant(Gender[Gender.male])
    }
    ];
  }

  public CalculateAge(birthDay: Date): number {
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

  ngOnInit(): void {
    this.route.data.subscribe(({student}) => {
        this.student = student;
        console.log(this.student);
        this.setField();
      }
    );
    this.route.data.subscribe((studentBData) => {
      this.studentBData = studentBData;
      this.student = this.studentBData.student;
      this.userPreferredScheduleService.userUuid = this.student.uuid;
      this.userPreferredScheduleService.userName = this.student.username;
      this.userPreferredScheduleService.rootPathToProfile = this.router.routerState.snapshot.root.children[0].routeConfig.path;
    });

    if (this.student.uuid) {
      this.studentService.getSettingsByStudentUuid(this.student).subscribe(value => {
        this.settings = value;
        console.log(this.settings);
        this.studentLoading = false;
      });
    } else {
      this.studentLoading = false;
    }
    this.languageLevelService.getAll().subscribe(value => {
      this.availableLanguageLevels = value;
    });
    this.groupService.getAll().subscribe(value => {
      this.availableGroups = value;
    });
    this.setContactTypes();
    this.translate.onLangChange.subscribe(() => {
      this.setContactTypes();
    });
    this.dragListHeightAuto();
    this.setValueInSelectInputGender();
    this.translate.onLangChange.subscribe(() => {
      this.setValueInSelectInputGender();
    });

  }


  setContactTypes(): void {
    this.selectContactTypes = [{
      value: ContactType.PHONE,
      label: this.translate.instant('PHONE')
    }, {
      value: ContactType.VIBER,
      label: this.translate.instant('VIBER')
    }, {
      value: ContactType.WHATSAPP,
      label: this.translate.instant('WHATSAPP')
    }, {
      value: ContactType.TELEGRAM,
      label: this.translate.instant('TELEGRAM')
    }

    ];
  }

  setActiveTab(event: any): void {
    if (event) {
      this.activeTabIndex = event.activeTabIndex;
    }
  }

  onChange(event): void {
    this.valid = event.match(this.emailPattern) != null;
    this.route.data.subscribe(({student}) => {
        this.student = student;
      }
    );
    this.languageLevelService.getAll().subscribe(value => {
      this.availableLanguageLevels = value;
    });
  }

  save(): void {
    this.valid = true;
    this.refInputs.forEach(value => {
      this.valid = this.valid && value.valid;
      value.validSave = value.valid;
    });
    this.loading = true;
    if (this.student.uuid == null || undefined) {
      this.userService.validEmail(this.student.email).subscribe((res: boolean) => {
        if (res) {
          if (this.valid) {
            this.studentService.save(this.student, this.profilePhoto).subscribe(() => {
              this.loading = false;
              this.fieldEditModal.hide();
              this.fieldSettingsModal.hide();
              this.returnToTable();
            });
          }
        }
      });
    } else {
      if (this.valid) {
        this.studentService.save(this.student, this.profilePhoto).subscribe(value => {
          this.student = value;
          this.setField();
          this.fieldEditModal.hide();
          this.fieldSettingsModal.hide();
          this.loading = false;
          this.returnToTable();
        });
      }
    }
  }

  updateContacts(): void {

    this.valid = true;
    this.refInputsContactEdit.forEach(value => {
      this.valid = this.valid && value.valid;
      value.validSave = value.valid;

    });


    if (this.valid) {
      this.student.email = this.email;
      this.loading = true;
      this.studentService.save(this.student).subscribe(() => {

          this.loading = false;
          this.contactsEditModal.hide();
        },
        error => {
          this.loading = false;
          this.contactsEditModal.hide();
        });

    }
  }

  updateGroups(): void {
    this.valid = true;
    if (this.valid) {
      this.student.groups = this.studentGroups;
      this.loading = true;
      this.studentService.save(this.student).subscribe(() => {
          this.loading = false;
          this.groupsEditModal.hide();
        },
        error => {
          this.loading = false;
          this.groupsEditModal.hide();
        });
    }
  }

  deleteContact(contact: Contact): void {
    const index = this.contacts.indexOf(contact);
    if (index >= 0) {
      this.contacts.splice(index, 1);
      this.student.contacts = this.contacts;
      this.studentService.save(this.student).subscribe(value => {
        this.student = value;
        this.contacts = this.student.contacts;
      });
    }
  }

  addContacts(): void {
    this.valid = true;
    this.refInputsContactAdd.forEach(value => {
      this.valid = this.valid && value.valid;
      value.validSave = value.valid;

    });

    if (this.valid) {
      this.contact.type = this.contactType;
      this.student.contacts.push(this.contact);
      this.loading = true;
      this.studentService.save(this.student).subscribe(value => {
          this.student = value;
          this.contacts = this.student.contacts;
          this.contact = new Contact();
          this.contactType = null;
          this.loading = false;
          this.contactsAddModal.hide();

        },
        error => {
          this.loading = false;
          this.contact = new Contact();
          this.contactsAddModal.hide();
        });

    }
  }

  returnToTable(): void {
    this.router.navigate(['students']);
  }

  get valid(): boolean {
    return this._valid;
  }

  set valid(value: boolean) {
    this._valid = value;
  }

  updateStudent(editForm: NgForm): void {
    this.student.firstName = editForm.value.firstName;
    this.student.secondName = editForm.value.secondName;
    this.student.lastName = editForm.value.lastName;
    this.student.email = editForm.value.email || this.email;
    if (!this.student.uuid) {
      this.student.username = editForm.value.username;
    }
    this.save();
  }

  saveAll(profileList: CdkDropList, firstList: CdkDropList, secondList: CdkDropList): void {
    this.settings.settingValue.blocks[0] = profileList.data;
    this.settings.settingValue.blocks[1] = firstList.data;
    this.settings.settingValue.blocks[2] = secondList.data;
    this.settingService.save(this.settings).subscribe();
  }

  addProfileImg(file: File): void {
    if (this.uploaderImg.isImageFile) {
      this.profilePhoto = file;
      this.saveImgModal.show();
    } else {
      this.profilePhoto = null;
      if (this.student.imageUrl) {
        this.uploaderImg.defaultFile = this.student.imageUrl;
      } else {
        this.uploaderImg.reset();
      }
    }
  }

  removeProfileImg(): void {
    this.profilePhoto = null;
    if (this.student.imageUrl) {
      this.uploaderImg.defaultFile = this.student.imageUrl;
    } else {
      this.uploaderImg.reset();
    }
  }

  dragListHeightSet(): void {
    this.dragListHeightAuto();
    if (window.innerWidth > 992) {
      setTimeout(() => {
        this.contentHeight = this.dragAndDropGroup.nativeElement.offsetHeight - 7;
      }, 50);
    }
  }

  drop(event: CdkDragDrop<number[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex);
    }
    this.dragListHeightAuto();
  }

  dragListHeightAuto(): void {
    this.contentHeight = 0;
  }
}
