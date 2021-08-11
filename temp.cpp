#include <iostream>
using namespace std;

struct Node
{
  Node *next;
  Node *prev;
  int datum;
};
class List
{
  //OVERVIEW: a doubly-linked, double-ended list with Iterator interface
public:
  List(int arr[], int n)
      : first(0), last(0)
  {
    for (int i = n - 1; i >= 0; --i)
    {
      push_front(arr[i]);
    }
  }

public:
  //EFFECTS:  inserts datum into the back of the list
  void push_front(int datum)
  {
    Node *np = new Node;

    if (!first)
    {
      np->next = 0;
      last = np;
    }
    else
    {
      np->next = first;
      first->prev = np;
    }
    np->prev = 0;
    np->datum = datum;
    first = np;
  }

  int list_sum()
  {
    Node *n = first;
    int sum = 0;
    while (n)
    {
      sum += n->datum;
      n = n->next;
    }
    return sum;
  }

private:
  //a private type

  Node *first; // points to first Node in list, or nullptr if list is empty
  Node *last;  // points to last Node in list, or nullptr if list is empty

public:
  ////////////////////////////////////////

  ~List()
  {
    for (Node *n = first; n;)
    {
      Node *v = n;
      n = n->next;
      delete v;
    }
  }

}; //List

////////////////////////////////////////////////////////////////////////////////
// Add your member function implementations below or in the class above
// (your choice). Do not change the public interface of List, although you
// may add the Big Three if needed.  Do add the public member functions for
// Iterator.

int main()
{
  int arr[4] = {1, 2, 3, 4};
  List list(arr, 4);
  cout << list.list_sum() << endl;
}
