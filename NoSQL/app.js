import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

const booksCol = collection(db, "books");
const borrowedCol = collection(db, "borrowedBooks");

const addBtn = document.getElementById("addBtn");
const borrowBtn = document.getElementById("borrowBtn");

// ===============================
// ADD BOOK
// ===============================
addBtn.addEventListener("click", async () => {
  const title = document.getElementById("title").value.trim();
  const author = document.getElementById("author").value.trim();
  const category = document.getElementById("category").value.trim();
  const copies = parseInt(document.getElementById("copies").value.trim());

  if (!title || !author || isNaN(copies)) {
    alert("⚠️ Please fill all fields properly!");
    return;
  }

  await addDoc(booksCol, { title, author, category, copies, createdAt: new Date() });
  alert("✅ Book Added Successfully!");
  ["title", "author", "category", "copies"].forEach(id => document.getElementById(id).value = "");
});

// ===============================
// REALTIME BOOK DISPLAY
// ===============================
onSnapshot(booksCol, (snapshot) => {
  const bookList = document.getElementById("book-list");
  bookList.innerHTML = "<h3>📖 All Books</h3>";

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const div = document.createElement("div");
    div.className = "book-item";
    div.innerHTML = `
      <strong>${data.title}</strong> by ${data.author}<br>
      Category: ${data.category} | Copies: ${data.copies}<br>
      <button onclick="editBook('${docSnap.id}','${data.title}','${data.author}','${data.category}',${data.copies})">Edit</button>
      <button onclick="deleteBook('${docSnap.id}')">Delete</button>
    `;
    bookList.appendChild(div);
  });
});

// ===============================
// BORROW BOOK WITH DUE DATE
// ===============================
borrowBtn.addEventListener("click", async () => {
  const studentName = document.getElementById("studentName").value.trim();
  const bookTitle = document.getElementById("bookTitleBorrow").value.trim();

  if (!studentName || !bookTitle) {
    alert("⚠️ Please enter both Student Name and Book Title!");
    return;
  }

  const q = query(booksCol, where("title", "==", bookTitle));
  const result = await getDocs(q);

  if (result.empty) {
    alert("❌ Book not found!");
    return;
  }

  const bookDoc = result.docs[0];
  const bookData = bookDoc.data();

  if (bookData.copies <= 0) {
    alert("⚠️ No copies available for borrowing!");
    return;
  }

  const borrowDate = new Date();
  const dueDate = new Date(borrowDate);
  dueDate.setDate(borrowDate.getDate() + 7); // 7 days later

  await addDoc(borrowedCol, {
    studentName,
    bookTitle,
    borrowDate,
    dueDate,
  });

  await updateDoc(doc(db, "books", bookDoc.id), {
    copies: bookData.copies - 1,
  });

  alert(`✅ ${studentName} borrowed "${bookTitle}" (Due: ${dueDate.toDateString()})`);
  document.getElementById("studentName").value = "";
  document.getElementById("bookTitleBorrow").value = "";
});

// ===============================
// REALTIME BORROWED BOOKS DISPLAY
// ===============================
onSnapshot(borrowedCol, (snapshot) => {
  const borrowList = document.getElementById("borrowed-list");
  borrowList.innerHTML = "<h3>🎓 Borrowed Books</h3>";

  if (snapshot.empty) {
    borrowList.innerHTML += "<p>No borrowed books.</p>";
    return;
  }

  const now = new Date();

  snapshot.forEach((docSnap) => {
    const d = docSnap.data();
    const isOverdue = now > new Date(d.dueDate.seconds * 1000);
    const div = document.createElement("div");
    div.className = "book-item";
    div.style.borderLeft = isOverdue ? "6px solid red" : "6px solid green";
    div.innerHTML = `
      <strong>${d.bookTitle}</strong> borrowed by <em>${d.studentName}</em><br>
      Borrowed on: ${new Date(d.borrowDate.seconds * 1000).toLocaleDateString()} |
      Due: <b>${new Date(d.dueDate.seconds * 1000).toLocaleDateString()}</b><br>
      ${isOverdue ? "<span style='color:red'>⚠️ Overdue!</span><br>" : ""}
      <button onclick="returnBook('${docSnap.id}','${d.bookTitle}')">Return</button>
    `;
    borrowList.appendChild(div);
  });
});

// ===============================
// RETURN BOOK
// ===============================
window.returnBook = async (borrowId, bookTitle) => {
  const q = query(booksCol, where("title", "==", bookTitle));
  const bookSnap = await getDocs(q);
  if (bookSnap.empty) return;
  const bookDoc = bookSnap.docs[0];
  const bookData = bookDoc.data();

  await updateDoc(doc(db, "books", bookDoc.id), {
    copies: bookData.copies + 1,
  });

  await deleteDoc(doc(db, "borrowedBooks", borrowId));
  alert(`✅ "${bookTitle}" has been returned successfully!`);
};

// ===============================
// LOOKUP / CROSS-COLLECTION QUERIES
// ===============================

// 1️⃣ Show borrowed books with author & category (lookup)
window.showBorrowedBookDetails = async () => {
  const borrowSnap = await getDocs(borrowedCol);
  const booksSnap = await getDocs(booksCol);
  const bookMap = {};
  booksSnap.forEach(d => bookMap[d.data().title] = d.data());

  const container = document.getElementById("lookup-results");
  container.innerHTML = "<h3>📘 Borrowed Book Details</h3>";
  borrowSnap.forEach(b => {
    const bd = b.data();
    const bookInfo = bookMap[bd.bookTitle];
    container.innerHTML += `
      <div class="book-item">
        <strong>${bd.bookTitle}</strong> (${bookInfo?.category || "Unknown"})<br>
        Author: ${bookInfo?.author || "Unknown"}<br>
        Borrowed by: <em>${bd.studentName}</em><br>
        Due: ${new Date(bd.dueDate.seconds * 1000).toDateString()}
      </div>`;
  });
};

// 2️⃣ Show overdue books
window.showOverdueBooks = async () => {
  const snap = await getDocs(borrowedCol);
  const now = new Date();
  const overdue = snap.docs.filter(d => new Date(d.data().dueDate.seconds * 1000) < now);
  const container = document.getElementById("lookup-results");
  container.innerHTML = "<h3>⏰ Overdue Books</h3>";
  if (overdue.length === 0) {
    container.innerHTML += "<p>No overdue books ✅</p>";
    return;
  }
  overdue.forEach(d => {
    const data = d.data();
    container.innerHTML += `
      <div class="book-item" style="border-left:6px solid red;">
        <strong>${data.bookTitle}</strong> borrowed by <em>${data.studentName}</em><br>
        Due: ${new Date(data.dueDate.seconds * 1000).toLocaleDateString()}
      </div>`;
  });
};

// 3️⃣ Students by category
window.showStudentsByCategory = async () => {
  const cat = prompt("Enter category name:");
  const bookSnap = await getDocs(query(booksCol, where("category", "==", cat)));
  if (bookSnap.empty) return alert("No such category found!");
  const titles = bookSnap.docs.map(d => d.data().title);

  const borrowSnap = await getDocs(borrowedCol);
  const filtered = borrowSnap.docs.filter(d => titles.includes(d.data().bookTitle));
  const students = [...new Set(filtered.map(d => d.data().studentName))];

  const container = document.getElementById("lookup-results");
  container.innerHTML = `<h3>🎯 Students who borrowed ${cat} books</h3>`;
  if (students.length === 0) {
    container.innerHTML += "<p>No students borrowed books in this category.</p>";
    return;
  }
  students.forEach(s => {
    container.innerHTML += `<div class="book-item">${s}</div>`;
  });
};

// 4️⃣ Students with multiple borrows
window.showStudentsWithMultipleBorrows = async () => {
  const snap = await getDocs(borrowedCol);
  const countMap = {};
  snap.forEach(d => {
    const s = d.data().studentName;
    countMap[s] = (countMap[s] || 0) + 1;
  });
  const multi = Object.entries(countMap).filter(([_, c]) => c > 1);

  const container = document.getElementById("lookup-results");
  container.innerHTML = "<h3>👥 Students with Multiple Borrows</h3>";
  if (multi.length === 0) {
    container.innerHTML += "<p>No student has multiple borrows.</p>";
    return;
  }
  multi.forEach(([name, count]) => {
    container.innerHTML += `<div class="book-item">${name} — ${count} books</div>`;
  });
};

// ===============================
// BASIC UTILS
// ===============================
window.deleteBook = async (id) => {
  await deleteDoc(doc(db, "books", id));
  alert("🗑️ Book Deleted!");
};

window.editBook = async (id, title, author, category, copies) => {
  const newTitle = prompt("New Title:", title);
  const newAuthor = prompt("New Author:", author);
  const newCategory = prompt("New Category:", category);
  const newCopies = prompt("New Copies:", copies);
  if (newTitle) {
    await updateDoc(doc(db, "books", id), {
      title: newTitle,
      author: newAuthor,
      category: newCategory,
      copies: parseInt(newCopies),
    });
    alert("✅ Updated Successfully!");
  }
};
